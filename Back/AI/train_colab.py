# -*- coding: utf-8 -*-
"""
천안시 교통약자 안전 인텔리전스 - 구글 코랩(Google Colab) 파인튜닝 스크립트
대상 환경: 구글 코랩 무료 T4 GPU (비디오 메모리 15GB)
대상 베이스 모델: Qwen/Qwen2.5-7B-Instruct (또는 3B / 1.5B)
학습 프레임워크: Unsloth (4비트 QLoRA 초고속 학습) + 올라마(Ollama)용 GGUF 자동 변환
"""

# [1단계] 코랩 필수 패키지 자동 점검 및 설치
try:
    import unsloth
    from unsloth import FastLanguageModel
except ImportError:
    import subprocess
    import sys
    print("코랩 환경에 unsloth 및 필수 학습 패키지를 자동으로 설치합니다. (약 1분 소요)")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "unsloth"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--no-deps", "trl", "peft", "accelerate", "bitsandbytes"])
    from unsloth import FastLanguageModel

import os
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# [2단계] 모델 및 학습 하이퍼파라미터 설정
MAX_SEQ_LENGTH = 2048  # 최대 입력 토큰 길이
DTYPE = None           # 가속기 자동 감지 (코랩 T4 GPU 환경에서는 Float16 자동 설정)
LOAD_IN_4BIT = True    # 4비트 양자화 로드로 VRAM 절약
MODEL_NAME = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"  # 베이스 모델 (필요 시 Qwen2.5-3B 또는 1.5B로 변경 가능)

print(f"베이스 모델을 로드하는 중입니다: {MODEL_NAME}")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=DTYPE,
    load_in_4bit=LOAD_IN_4BIT,
)

# [3단계] QLoRA 어댑터 가중치 설정 (핵심 어텐션 및 피드포워드 레이어 학습)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,                # LoRA 랭크 (높을수록 표현력이 향상되며 16이 가장 안정적)
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=32,       # LoRA 알파 스케일링 계수
    lora_dropout=0,      # Unsloth 최적화 드롭아웃 설정
    bias="none",
    use_gradient_checkpointing="unsloth",  # VRAM 사용량을 획기적으로 줄이는 그래디언트 체크포인팅
    random_state=42,
)

# [4단계] ChatML 대화형 프롬프트 템플릿 변환 함수
def formatting_prompts_func(examples):
    convos = examples["messages"]
    texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False) for convo in convos]
    return {"text": texts}

# [5단계] 데이터셋 로드 (코랩 좌측 파일 창에 train.jsonl과 valid.jsonl 파일을 업로드한 후 실행하세요)
print("업로드된 천안시 교통안전 데이터셋(train.jsonl, valid.jsonl)을 로드합니다...")
dataset = load_dataset("json", data_files={"train": "train.jsonl", "validation": "valid.jsonl"})
dataset = dataset.map(formatting_prompts_func, batched=True)
print(f"학습 데이터: {len(dataset['train'])}건, 검증 데이터: {len(dataset['validation'])}건 로드 완료")

# [6단계] 학습 세부 파라미터 구성
training_args = TrainingArguments(
    per_device_train_batch_size=2,      # GPU 배치 크기
    gradient_accumulation_steps=4,      # 그래디언트 누적 스텝 (유효 배치 크기 = 8)
    warmup_steps=10,                    # 웜업 스텝
    max_steps=100,                      # 300건 기준 약 3 에포크 학습
    learning_rate=2e-4,                  # 학습률 (코사인 감쇠 스케줄러 적용)
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,                   # 10스텝마다 손실값 출력
    optim="adamw_8bit",                 # 8비트 AdamW 옵티마이저로 VRAM 최적화
    weight_decay=0.01,
    lr_scheduler_type="cosine",
    seed=42,
    output_dir="outputs",
    save_strategy="no",
)

# [7단계] 지도 학습 트레이너(SFTTrainer) 초기화
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    packing=False,
    args=training_args,
)

# [8단계] 코랩 T4 GPU에서 파인튜닝 시작
print("구글 코랩 T4 GPU에서 파인튜닝 학습을 시작합니다. (약 15분 소요)")
trainer_stats = trainer.train()
print("파인튜닝 학습이 성공적으로 완료되었습니다!")

# [9단계] 로컬 올라마(Ollama) 구동을 위한 4비트 GGUF 단일 파일 자동 변환 및 저장
GGUF_DIR = "cheonan_safety_model_gguf"
print(f"올라마 전용 GGUF 포맷으로 양자화 변환을 진행합니다: {GGUF_DIR}")
model.save_pretrained_gguf(GGUF_DIR, tokenizer, quantization_method="q4_k_m")

print("GGUF 변환이 완료되었습니다!")
print(f"코랩 좌측 파일 목록에서 {GGUF_DIR}/ 폴더 안의 .gguf 파일을 다운로드하여 내 컴퓨터의 Back/AI/ 폴더에 넣어주세요.")
