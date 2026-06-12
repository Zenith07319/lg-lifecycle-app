// Figma 04-2 진단결과 / 상세  → 우리 앱 /result/[id] 상단(히어로+전기요금)
// 원본: Figma to Code (React/inline). 절대좌표·하드코딩. 이식 시 데이터/반응형 정리 필요.
// 데이터 매핑: 32=health_score, E=health_grade, 7년차=age_years,
//   99,681=ac_delta_old, 40,931=ac_delta_new, 1,175,000=save5,
//   451~/301~450=tier_old/new, 69=inspection_score_100, 43%=energy_waste_ratio
export default function Result042() {
  return (
<div style={{width: 390, height: 844, position: 'relative', background: '#ECEDED', overflow: 'hidden', borderRadius: 28, backdropFilter: 'blur(10px)'}}>
  {/* 하단 탭바 */}
  <div style={{width: 390, height: 78, left: 0, top: 766, position: 'absolute', background: 'white', boxShadow: '0px -4px 14px rgba(0, 0, 0, 0.08)', overflow: 'hidden'}}>
    <div style={{left: 71, top: 51, position: 'absolute', color: '#047D86', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>진단</div>
    <div style={{left: 155, top: 51, position: 'absolute', color: 'black', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>내 가전</div>
    <div style={{left: 246, top: 51, position: 'absolute', color: 'black', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>더보기</div>
    <div style={{left: 58, top: 51, position: 'absolute', color: 'black', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>홈</div>
  </div>
  {/* 전기요금 유리카드 */}
  <div style={{width: 343, height: 116, left: 23, top: 441, position: 'absolute', background: 'rgba(255, 255, 255, 0.32)', boxShadow: '0px 16px 40px rgba(179.42, 201, 166, 0.12)', overflow: 'hidden', borderRadius: 16, outline: '1px rgba(255, 255, 255, 0.35) solid', outlineOffset: '-1px', backdropFilter: 'blur(15px)'}}>
    <div style={{width: 168, height: 116, left: 175, top: 0, position: 'absolute', background: 'rgba(255, 255, 255, 0.50)', boxShadow: '0px 4px 4px rgba(0,0,0,0.10)', overflow: 'hidden', borderRadius: 16}}>
      <div style={{left: 14, top: 40, position: 'absolute', color: '#047D86', fontSize: 18, fontFamily: 'Pretendard', fontWeight: '700'}}>₩40,931</div>
      <div style={{left: 14, top: 63, position: 'absolute', color: 'rgba(0,0,0,0.25)', fontSize: 13, fontFamily: 'Pretendard', fontWeight: '700'}}>1등급 신형</div>
      <div style={{paddingLeft: 5, paddingRight: 5, paddingTop: 4, paddingBottom: 4, left: 112, top: 10, position: 'absolute', background: '#EEF8F7', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4}}>
        <div style={{width: 3, height: 3, background: '#047D86', borderRadius: 2.5}} />
        <div style={{color: '#047D86', fontSize: 6, fontFamily: 'Pretendard', fontWeight: '700'}}>입력값 기준</div>
      </div>
    </div>
    <div style={{left: 14, top: 14, position: 'absolute', color: 'black', fontSize: 11, fontFamily: 'Pretendard', fontWeight: '700'}}>전기요금 (에어컨 기여 · 월)</div>
    <div style={{left: 14, top: 40, position: 'absolute', color: '#047D86', fontSize: 18, fontFamily: 'Pretendard', fontWeight: '700'}}>₩99,681</div>
    <div style={{left: 14, top: 63, position: 'absolute', color: 'rgba(0,0,0,0.25)', fontSize: 13, fontFamily: 'Pretendard', fontWeight: '700'}}>내 에어컨</div>
  </div>
  {/* 개인화 문구 */}
  <div style={{left: 97, top: 392, position: 'absolute', width: 244, fontSize: 15, fontFamily: 'Pretendard', fontWeight: '800'}}>
    <span style={{color: 'black'}}>윤지님, 매달 </span><span style={{color: '#C23630'}}>전기요금</span><span style={{color: 'black'}}>을 더 내고 있어요</span>
  </div>
  {/* CTA */}
  <div style={{width: 342, height: 45, left: 28, top: 753, position: 'absolute', background: '#047D86', boxShadow: '0px 4px 4px rgba(0,0,0,0.10)', borderRadius: 999, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8, color: 'white', fontSize: 14, fontFamily: 'Pretendard', fontWeight: '700'}}>판단 근거 확인하기</div>
  {/* 건강점수 / 에너지등급 링 */}
  <div style={{left: 26, top: 139, position: 'absolute', color: '#8C949E', fontSize: 11, fontFamily: 'Pretendard', fontWeight: '700'}}>건강 점수</div>
  <div style={{left: 262, top: 58, position: 'absolute', color: '#8C949E', fontSize: 11, fontFamily: 'Pretendard', fontWeight: '700'}}>점수 계산이 궁금하다면 ?</div>
  <div style={{left: 22, top: 152, position: 'absolute', color: '#1A1C21', fontSize: 72, fontFamily: 'Pretendard', fontWeight: '700', lineHeight: '72px'}}>32</div>
  <div style={{left: 26, top: 234, position: 'absolute', color: '#8C949E', fontSize: 13, fontFamily: 'Pretendard', fontWeight: '600'}}>에어컨 · 설치 7년차</div>
  <div style={{left: 27, top: 255, position: 'absolute', color: '#C23630', fontSize: 12, fontFamily: 'Pretendard', fontWeight: '600'}}>즉시 점검 권장</div>
  <div style={{width: 108, height: 108, left: 258, top: 124, position: 'absolute', background: '#C23630', borderRadius: 9999}} />
  <div style={{width: 72, left: 276, top: 151, position: 'absolute', textAlign: 'center', color: '#C23630', fontSize: 45, fontFamily: 'Pretendard', fontWeight: '700'}}>E</div>
  <div style={{left: 289, top: 240, position: 'absolute', textAlign: 'right', color: '#8C949E', fontSize: 11, fontFamily: 'Pretendard', fontWeight: '700'}}>에너지 등급</div>
  {/* 누진/점검/낭비 타일 */}
  <div style={{width: 166, height: 115, left: 25, top: 617, position: 'absolute', background: 'white', boxShadow: '0px 2px 8px rgba(5.10,30.60,30.60,0.06)', overflow: 'hidden', borderRadius: 16}}>
    <div style={{left: 14, top: 14, position: 'absolute', color: '#8C949E', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>누진 구간 이동</div>
    <div style={{left: 52, top: 37, position: 'absolute', color: '#1A1C21', fontSize: 14, fontFamily: 'Pretendard', fontWeight: '600'}}>451~kWh</div>
    <div style={{left: 33, top: 83, position: 'absolute', color: '#1A1C21', fontSize: 15, fontFamily: 'Pretendard', fontWeight: '600'}}> 301~450kWh </div>
  </div>
  <div style={{left: 23, top: 44, position: 'absolute', color: '#1A1C21', fontSize: 26, fontFamily: 'Pretendard', fontWeight: '700'}}>진단 결과 </div>
  <div style={{left: 24, top: 81, position: 'absolute', color: '#8C949E', fontSize: 12, fontFamily: 'Noto Sans KR', fontWeight: '400'}}>에어컨 · 설치 7년차 · 비용 우선</div>
  <div style={{width: 339, height: 37, left: 28, top: 567, position: 'absolute', background: 'rgba(255,255,255,0.50)', boxShadow: '0px 4px 4px rgba(0,0,0,0.10)', overflow: 'hidden', borderRadius: 16}}>
    <div style={{left: 13, top: 13, position: 'absolute', color: 'black', fontSize: 11, fontFamily: 'Pretendard', fontWeight: '600'}}>5년 절감 금액 (교체 시)</div>
    <div style={{left: 222, top: 10, position: 'absolute', color: 'black', fontSize: 15, fontFamily: 'Pretendard', fontWeight: '700'}}>₩1,175,000</div>
  </div>
  <div style={{width: 151, height: 55, left: 213, top: 617, position: 'absolute', background: 'white', boxShadow: '0px 2px 8px rgba(5.10,30.60,30.60,0.06)', overflow: 'hidden', borderRadius: 16}}>
    <div style={{left: 96, top: 16, position: 'absolute', textAlign: 'center', color: '#1A1C21', fontSize: 20, fontFamily: 'Pretendard', fontWeight: '700'}}>69</div>
    <div style={{left: 10, top: 10, position: 'absolute', color: '#8C949E', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>점검 필요도</div>
  </div>
  <div style={{width: 151, height: 55, left: 213, top: 676, position: 'absolute', background: 'white', boxShadow: '0px 2px 8px rgba(5.10,30.60,30.60,0.06)', overflow: 'hidden', borderRadius: 16}}>
    <div style={{left: 86, top: 19, position: 'absolute', textAlign: 'center', color: '#1A1C21', fontSize: 20, fontFamily: 'Pretendard', fontWeight: '700'}}>43%</div>
    <div style={{left: 12, top: 9, position: 'absolute', color: '#8C949E', fontSize: 10, fontFamily: 'Pretendard', fontWeight: '600'}}>에너지 낭비</div>
  </div>
  {/* 일러스트(placehold.co → 실제 에셋 교체) */}
  <img style={{width: 48, height: 48, left: 33, top: 379, position: 'absolute'}} src="https://placehold.co/48x48" alt="avatar" />
  <img style={{width: 163, height: 163, left: 115, top: 239, position: 'absolute'}} src="https://placehold.co/163x163" alt="aircon" />
</div>
  );
}
