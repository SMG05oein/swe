import { useState } from 'react';
import './ApiKeyModal.css';

export default function ApiKeyModal({ isOpen, onClose, initialKeys, onSave }) {
  const [keys, setKeys] = useState({
    koroadKey: initialKeys?.koroadKey || '',
    dataGoKrKey: initialKeys?.dataGoKrKey || '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(keys);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">API 인증키 설정</h2>
        <p className="modal-desc">
          한국도로교통공단 및 공공데이터포털 인증키를 입력하면 실시간 API 호출로 전환됩니다. 키가 없어도 내장된 천안시 신부동 실물 표본 데이터로 완벽하게 작동합니다.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">
              도로교통공단 인증키 (opendata.koroad.or.kr)
            </label>
            <input
              type="text"
              className="text-input"
              placeholder="예: 발급받은 영문/숫자 인증키"
              value={keys.koroadKey}
              onChange={(e) =>
                setKeys({ ...keys, koroadKey: e.target.value })
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              공공데이터포털 인증키 (data.go.kr)
            </label>
            <input
              type="text"
              className="text-input"
              placeholder="공공데이터포털 일반 인증키 (Encoding/Decoding)"
              value={keys.dataGoKrKey}
              onChange={(e) =>
                setKeys({ ...keys, dataGoKrKey: e.target.value })
              }
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              닫기
            </button>
            <button type="submit" className="btn-primary">
              저장 및 적용
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
