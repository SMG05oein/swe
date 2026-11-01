/**
 * Enriched facility datasets for Cheonan (Shinbu-dong & Dujeong-dong)
 * Powers persona evaluations (child, elder, admin) with realistic sample data
 * when live external APIs lack specialized fields.
 */

export const CHEONAN_ENRICHED_FACILITIES = {
  safetyFence: [
    { lat: 36.8198, lng: 127.1568, count: 4, name: '천안중앙초 통학로 방호울타리' },
    { lat: 36.8202, lng: 127.1565, count: 2, name: '신부동 만남로 보차분리 펜스' },
    { lat: 36.8321, lng: 127.1402, count: 5, name: '두정초 스쿨존 안전울타리' },
    { lat: 36.8288, lng: 127.138, count: 3, name: '두정희망경로당 앞 무단횡단방지펜스' },
    { lat: 36.8245, lng: 127.156, count: 2, name: '도솔노인복지관 진입로 안전펜스' },
    { lat: 36.8152, lng: 127.1578, count: 3, name: '중앙로 노인보호구역 방호펜스' },
  ],
  yellowCarpet: [
    { lat: 36.8198, lng: 127.1568, count: 2, name: '천안중앙초 앞 옐로카펫' },
    { lat: 36.8205, lng: 127.1572, count: 1, name: '신부초 주변 노란색 횡단보도' },
    { lat: 36.8321, lng: 127.1402, count: 2, name: '두정초 앞 옐로카펫' },
    { lat: 36.8325, lng: 127.141, count: 1, name: '두정동 학원가 안심 옐로카펫' },
  ],
  schoolZoneCamera: [
    { lat: 36.8198, lng: 127.1568, count: 2, name: '천안중앙초 불법주정차 단속CCTV' },
    { lat: 36.8245, lng: 127.156, count: 1, name: '신부동 스쿨존 무인단속카메라' },
    { lat: 36.8321, lng: 127.1402, count: 2, name: '두정초 스쿨존 과속·주정차 단속장비' },
    { lat: 36.8155, lng: 127.1542, count: 1, name: '방죽안오거리 교통단속CCTV' },
  ],
  acousticSignal: [
    { lat: 36.8198, lng: 127.1568, count: 2, name: '천안중앙초 사거리 음향신호기' },
    { lat: 36.8245, lng: 127.156, count: 2, name: '도솔노인복지관 앞 음향신호기' },
    { lat: 36.8152, lng: 127.1578, count: 2, name: '천안시노인종합복지관 음향신호기' },
    { lat: 36.8288, lng: 127.138, count: 1, name: '두정희망경로당 앞 음향신호기' },
    { lat: 36.8321, lng: 127.1402, count: 1, name: '두정초교 사거리 음향신호기' },
  ],
  floorLight: [
    { lat: 36.8198, lng: 127.1568, count: 2, name: '천안중앙초 앞 바닥형 보행신호등' },
    { lat: 36.8202, lng: 127.1565, count: 2, name: '신부동 만남로 바닥형 보행신호등' },
    { lat: 36.8321, lng: 127.1402, count: 2, name: '두정초 정문 바닥형 보행신호등' },
    { lat: 36.8152, lng: 127.1578, count: 2, name: '원성동 노인보호구역 바닥신호등' },
  ],
  barrierFree: [
    { lat: 36.8198, lng: 127.1568, count: 4, name: '천안중앙초 주변 보도 턱낮춤' },
    { lat: 36.8245, lng: 127.156, count: 3, name: '도솔복지관 진입로 무장애 경사로' },
    { lat: 36.8152, lng: 127.1578, count: 4, name: '원성동 노인종합복지관 턱낮춤' },
    { lat: 36.8288, lng: 127.138, count: 2, name: '봉정로 무장애 평탄 보행로' },
    { lat: 36.8375, lng: 127.1435, count: 2, name: '두정마을 보도 단차 정비구간' },
  ],
  smartShelter: [
    { lat: 36.8202, lng: 127.1565, count: 1, name: '신부동 종합버스터미널 스마트 안심쉼터' },
    { lat: 36.8245, lng: 127.156, count: 1, name: '도솔노인복지관 앞 스마트 쉼터' },
    { lat: 36.8152, lng: 127.1578, count: 1, name: '원성동 어르신 안심 쉼터' },
    { lat: 36.8321, lng: 127.1402, count: 1, name: '두정초 앞 어린이 폭염그늘막·쉼터' },
  ],
};

