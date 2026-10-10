# 이번 업데이트에서 바뀐 내용

2026-10-10 공개판은 Codex CLI **0.162.0-alpha.17.2**, 등록 Desktop **26.1007.2314.0**에 맞췄습니다. 앞서 로컬에서 적용했던 수정도 완전한 누적 패치에 함께 담았습니다. 이번 문서 정리에서 실행 코드나 판단 정책을 추가로 바꾸지는 않았습니다.

| 대응한 증상·요구 | 적용 내용 | 확인한 범위와 한계 |
|---|---|---|
| 공개본과 업데이트된 Codex backend의 버전 차이 | 공식 0.162 base로 기존 수정을 이식하고 네 번째 companion인 sandbox service를 빌드·묶음 검사에 포함 | 관련 native 889검사와 빌드 근거 재사용. 순정 base에 패치 1회 적용한 전체 내용·Git mode 일치. 미래 Desktop 버전까지 보장하지 않음 |
| 자동 목표 진행에서 현재 목표가 빠져 `required_evidence_missing` 발생 | 수락된 현재 목표와 pending 입력을 sampling 전에 평가 문맥으로 전달. 필수 입력 누락은 평가 thread 생성 전에 거절 | 관련 회귀와 현재 실사용 연결 확인. 실제 입력이 없으면 fallback하며 과거 기록으로 목표를 만들어 넣지 않음 |
| 긴 현재 요청이 고정 28,000토큰 제한에 걸림 | 실제 평가 모델·provider·설정의 유효 문맥 한도와 framing 여유로 계산. 현재 요청 원문은 보존하고 선택적 과거 증거만 제한 | 합성 한도·초과·미확인·회복 검사. 실제 한도와 전송 제한은 유지. 새 장문 유료 품질 시험은 없음 |
| 중단된 도구 이력의 출력 결손으로 dev build가 sampling 전 panic | 기존 복구 가능한 prompt 사본 정규화를 dev에서도 적용 | 관련 history 검사 재사용. 저장된 원본 이력은 유지. 모든 과거 먹통이나 브라우저·MCP 문제의 해결을 뜻하지 않음 |
| 시간 조회 취소·큐 대기 과정의 callback 잔존 | 기존 deadline을 큐·등록·응답에 함께 적용하고 취소된 정확한 callback 회수 | 관련 outgoing/clock 검사. 도구 승인 대기는 timeout 처리하지 않음. 모든 멈춤의 공통 원인으로 단정하지 않음 |
| 패키지 ID 없는 시작, 임시 host 종료 뒤 supervisor 소멸, 종료 receipt 불일치 | MSIX 맥락에서 시작하고 Desktop·supervisor 수명을 분리. 등록 버전을 검사하고 log flush 결과를 최종 종료 코드에 반영 | 시작 계약·자연 종료 fixture·공개 preflight·현재 로컬 실행 확인. 새 공개 폴더에서 실제 Desktop을 켜는 검증은 미실시 |
| 상세 context 진단이 광범위하게 큰 로그를 생성 | 기본 비활성화하고 시작 시 정확한 대화 UUID 하나만 지정. 기존 Ares 요청·응답·fallback과 AgentMemory 반환 계측 유지 | 관련 native 7검사와 시작 인수·패키지 전달 근거 재사용. 현재 run의 상세 context 이벤트 0. 속도·비용 개선은 미측정 |

GPT-6 Luna/High app-server 평가, 한 generation lease, 같은 turn의 fresh 판단과 선택한 Main은 유지합니다. 일반 Luna에는 Ares를 붙이지 않습니다. 시험 예산은 제품의 호출 횟수 제한이 아닙니다. 이번 공개 업데이트에 Decisions API·Responses 대체 평가기·Jev 경로를 추가하지 않았습니다.

현재 실사용의 완전한 연결 173건에서 강도 불일치는 0건입니다. fallback 응답 49건과 같은 turn 회복 8건도 확인했습니다. 이전 응답 근거가 없는 1건, 취소와 일부 generic 오류 원인은 UNKNOWN입니다. 짧은 연결 확인을 장기 안정성·판단 품질·절감률 검증으로 확대하지 않습니다.

[검증 결과](validation.md) · [호환 범위](compatibility.md) · [빌드·업데이트 절차](build.md) · [English](../CHANGELOG.md)
