# 현재 로컬 검토 — 0.164 격리 소스 후보 (HOLD)

## 현재 0.164 Terra 후보

Terra 별칭·지원 강도 상속·일반 모델 우회를 추가하고 새 source/patch와 역사적 계약 근거를 분리해 결속했습니다. 고정 5종 빌드와 새 정적 320/458 계약·Doctor/preflight 1560은 통과했으며 native 90검사와 compact 6 본문 미실행을 구분합니다. 운영·보안 설정·인증은 바꾸지 않았습니다. 전체 결과와 한계는 validation.md를 따릅니다.

## Local0.164 review candidate — unpublished

Pinned official6905eced source,68-path patch, prepared Cargo.lock, Rust1.99.1 and V8152.2.0 now share one portable input set. Full regular-file identity and Git content/mode restoration are checked separately from physical symlink creation. Two synthetic fixture task IDs are anonymized; three TUI paths repair exact notification routing and baseline preservation after a real compile failure. CLI+four companions and static Desktop contracts require current-run evidence; old0.163 results are historical. No new GUI/provider acceptance, operating change or publication is claimed. [검증 범위](validation.md).

## Historical0.163 preparation below

0.163 고정 소스 d9affe0e에 실제 시작 정책 조회·구조화 오류 처리를 이식했습니다. 공개 launcher는 필수 flag가 없으면 시작 전 거부하며 상대 import·소유 temp·수명 관리를 유지합니다. Setup의 TEMP/TMP/TMPDIR 지정은 소스 복원 앞으로 옮겼습니다. 새 복원9,194파일/mode·단위검사112개·양 PowerShell105개씩·기존 바이너리5종 bundle/Doctor가 통과했습니다. Desktop3705 실제 preflight는 미호환 계약을 거부해 exit1이며 성공 기동으로 계산하지 않습니다. 새 빌드·모델 호출·공개 게시·동일 공개물 GUI 수용은 하지 않았습니다. [현재 근거](validation.md)를 따릅니다.

아래 preview.2는 이전 소스의 역사적 검증입니다.

# 0.1.0-preview.2 소스 프리뷰 변경 안내

공식 Codex **0.163.0** commit `83086188ae0614bd882818ff1aa23f3194962012` 위에 기존 Ares 제어를 이식했습니다. 관측 Desktop은 **26.1013.4894.0**입니다. 실행파일을 배포하는 버전이 아니라 고정된 소스에서 사용자가 직접 빌드하는 프리뷰입니다.

| 대응한 문제·요구 | 변경 | 근거와 한계 |
|---|---|---|
| Desktop/backend가 이전 0.162 기준을 넘어섬 | 누적 native 변경을 0.163으로 이식하고 CLI·companion 네 개를 같은 lock에 연결 | 대응 비공개 실행본 기능 검증이 있음. 공개 소스 9,193파일/mode 복원, 기본 npm test 95개, bundle/Doctor/preflight 1,557개 통과. 기존 native를 재사용했으며 새 공개 GUI/provider 수용은 NOT_RUN |
| 수락된 작업 전달과 별칭 압축·재개에서 현재 입력·모델 계약 보존 | native 전달 입력을 평가에 연결하고 압축·재개 경로 유지 | 격리 RPC 전달 입력과 같은 고정 native의 GUI Medium·압축·재개 확인. 일반 GUI에서 전달 입력이 생성되는 과정은 관측하지 않음 |
| 패키지 실행이 실제 기동 결과 없이 반환될 가능성 | GUID별 완료 receipt와 오류 전파, 실제 Desktop/backend 전체 신원·candidate 실행 연속성 확인 | 별도 시작 수정 근거가 있음. 원래 PowerShell 오류 원인과 당시 launch manifest 바이트 해시는 UNKNOWN |
| 취소 후 같은 대화에서 정상 작업을 이어가야 함 | 새 native에서 취소·회복 동작 유지 | 비공개 GUI Stop 취소 확인(요청 로그 elapsed 452ms, 클릭 반응시간 측정 아님), 취소 턴의 추가 Main 생성 0건. 같은 대화 후속 응답 3,001ms 완료·화면 표식 확인 |

GPT-6 Luna/High app-server 평가, 선택한 Main, 한 generation의 판단 유효기간, 일반 Luna 제외와 composer metadata 경계는 유지합니다. 일반 본문의 단어만으로 평가를 제외하지 않습니다. 시험 예산을 제품의 호출 횟수 제한으로 바꾸지 않습니다.

작은 기능 관측과 이후 3업무 비교는 보편적인 품질 동등성·절감률·장기 안정성을 입증하지 않습니다. 이번 소스 준비에는 새 유료 수용 호출이 포함되지 않습니다. 원래 오류의 원인을 확인한 것과 현재 시작 경로를 보완한 것을 구분합니다.

## 빌드·사용

Windows x64, Node.js 22+/npm, Git, rustup, Visual Studio x64 C++ 도구와 정확히 호환되는 등록 Codex Desktop이 필요합니다. 버전·archive·patch·의존성·소스 identity 정본은 [lock](../patches/codex/upstream.lock.json)입니다.

사용할 소스 revision을 확인한 checkout에서 `npm run setup`으로 빌드합니다. 이후 `.\scripts\doctor.ps1`, `.\scripts\start.ps1 -PreflightOnly`를 확인하고, 기존 작업을 마쳐 Codex를 정상 종료한 뒤 일반 권한 PowerShell에서 `.\scripts\start.ps1`을 실행합니다. Doctor·preflight는 GUI나 모델 응답의 증거가 아닙니다. 완료가 불명확하면 안내된 receipt와 실제 프로세스를 확인한 뒤 재시도를 판단합니다.

업데이트는 새 checkout의 빈 소스에 누적 patch를 한 번 적용합니다. 이전 수용 checkout/bundle은 복구용으로 보존합니다. 설치본 복귀는 정상 종료 후 평소 설치 Codex를 여는 방식입니다. 강제 종료·DB 수정·인증 복사·버전 검사 해제로 우회하지 않습니다. 자세한 [설치·업데이트·복구·제거 절차](build.md#update-recovery-and-removal)를 따릅니다.

## 이전 공개판 근거

2026-10-16 preview.1은 Codex0.162.0-alpha.17.2/Desktop26.1007.9446.0에서 공개 suite82개·9,013파일 복원과 새 출력 CLI·companion 빌드, 기존 MSIX/Node의 Sol/Luna xhigh 응답과 운영 복귀를 확인했습니다. 당시 수치와 소스 identity는 이번 후보의 결과로 옮겨 쓰지 않습니다. 기존 태그·자산도 교체하지 않습니다.

2026-10-10 기록의 완전한 연결 173generation, fallback49응답·같은 turn 회복8건은 당시 실행본의 고정 집계입니다. 사용자 업무 173개 완료나 품질·비용 우위로 해석하지 않습니다. 기존 파일럿과 제거된 Jev 경로의 결과도 역사 자료로 보존합니다.

[상세 검증](validation.md) · [호환성](compatibility.md) · [빌드](build.md) · [English change history](../CHANGELOG.md)
