# 현재 0.166 소스 프리뷰 — 로컬 검증

공식 Codex0.166.0-alpha.5.1 upstream `f79b26ccbb3116b052544666a181012fb45dc49b`에 누적 Ares 변경을 이식했습니다. native identity는 `f602eec364f061f64d513b1cb77208fcaaa707ecc1bf1c61d3d20bb1f48052ac`, patch는 `05016f6a951ed208895373ac1a0f82dd763026c4ff630b3f156e34224b904d49`입니다. 180경로(수정163·신규17), 일반 파일9,711개와 materialized link1개를 검증했습니다. [Lock](../patches/codex/upstream.lock.json)이 정확한 입력을 소유합니다.

새 오류 enum은 민감 본문 없이 정적 errorClass와 관측 HTTP status만 기록하며 재시도 정책은 바꾸지 않습니다. Upstream 응답 sender·비동기 이미지 저장·tool cwd/hook 계약을 유지하면서 기존 취소·입력 출처·권한/설정 보호를 이식했고, 공식 생성기로 protocol/SDK 계약을 갱신했습니다. Launcher는 새 정확한 MSIX/native만 지원 목록에 추가하며 인접 버전·혼합 companion 거부를 유지합니다.

같은 소스의 CLI·companion4개 빌드와 새 stable320/experimental466 proof, 기본 npm244/0/0, bundle·Doctor·preflight1561이 통과했습니다. SDK122·protocol317와 별도 생성기·native 집중180·기본값17·startup/model63+6·mock app-server7은 각각의 범위이며 전체 품질 총계로 합산하지 않습니다. 실패 시도와 수정 후 결과는 [검증 범위](validation.md)에 구분했습니다.

검사 CLI `456a494b…`와 같은 해시의 이후 작업표시줄 수동 기동을 관측했습니다. 현재 후보의 전용 GUI effort·Stop/회복·압축/재개·provider 수용과 새 PC 설치는 미검증입니다. 별도 로컬 자동 재시작은 실패했고 해당 도우미는 공개본에 포함하지 않습니다. 전체 native patch 독립 검토는 미완료이며 작은 품질 표본·과거 GUI 결과를 현재 수용이나 절감 주장으로 확대하지 않습니다. 0.1.0-preview.4는 소스 전용 Technical Preview이며 정확한 게시 커밋·CI 결과·소스 체크섬은 Release에서 확인합니다.

# 역사적 0.165 root-bound 소스 — 당시 로컬 검토

아래0.165/0.164/0.163 내용의 현재·미실시·검토 대기 표현은 각 checkpoint의 당시 상태입니다.

현재 native identity는 `4cbf74d39c9072f013b0b0eb844b1ee7253e1eaefa222010ccc382b4d12596ff`이며 180경로(수정163·신규17), 일반 파일9,523개와 materialized link1개입니다. 명시적 저장 root와 소유·권한·수동 effort 보호를 연결했습니다. 오래된 lock 요약176을180으로 정정하며 native patch·runtime·test 바이트는 바꾸지 않습니다. 전체 lock SHA를 결속하는 기존 빌드 절차는 유지합니다. 새 bundle에는 기존 wrapper의 실제 성공 기록과 새 proof가 필요하며 과거 기록을 고쳐 쓰지 않습니다.

기존 Desktop6621 layout의 정적320/460, 기본 npm243, preflight1561 및 작업표시줄 수동 기동·Main 완료·Luna 판단을 관측했습니다. 자동 재시작은 운영 복구본 생성 전에 실패했고 원래 inventory drift 원인은 UNKNOWN입니다. 0.165 전용 GUI effort·Stop·회복·압축/재개와 새 PC 수용은 아직 미완료입니다. [검증 범위](validation.md)를 따르며 작은 품질 표본이나 과거0.163 결과를 현재 수용으로 확대하지 않습니다.

## 역사적 source341 checkpoint

아래의 현재·미실시·검토 대기 표현은 해당 시점의 원문입니다.

# Codex 0.165.0 수정 후보 — 재시작 전 검토

현재 소스는 `341dfcf3b3facb2fa99cc009b9b69f67c67f3fb99a9c090b357c979beaf248a7`, patch는 `6401f12a013dbeda4f48d29ddbd70f324ed602fb1e6f99a29200802107621910`, tree는 `46506a2e270b9ee75bdbabc38ed195f18f3142ee`입니다. 공식 upstream·Cargo.lock은 유지하며176경로(수정160·신규16), 일반 파일9522개·materialized link1개입니다. [Lock](../patches/codex/upstream.lock.json)과 [patch map](../patches/codex/PATCH_MAP.md)을 따릅니다.

## Ares 시작 전제조건 수정

전용 Ares mode와 TCP/token이 모두 설정된 자식 환경에서만 StepModelSwitching 기본값을 제공합니다. 일반 upstream 기본값은 바꾸지 않고, merged 명시 설정과 managed false가 우선합니다. ReasoningEffortOverride의 false도 활성화하거나 덮어쓰지 않습니다. Launcher는 실제 Desktop 자식 환경으로 native feature를 조회하고 false·누락·조회 실패이면 소유 서비스를 정리한 뒤 Desktop 시작을 거부합니다. 전역 config·인증·권한·sandbox 정책은 바꾸지 않습니다.

## 수정 후 실제 실행

Config17·feature 강제 enable을 제거한 기본 경로 mock RPC7·시작 보호18·실제 effective-config4가 통과했습니다. 기본 npm test236/0/0, offline locked npm restore, source341의 실제5종 빌드 exit0, 별도 bundle/Doctor/preflight1560과 새 로컬320/460 proof가 통과했습니다. CLI 해시는 `82b99555e35124b98d7e9e4d9c4e34e5bbe8cb5f6cb785a032125564f08e03bf`입니다. Wrapper의 bundle_not_run은 이후 별도 bundling/proof 실행과 모순되지 않습니다. 같은 새 bundle로 mock SDK runtime46개가156.41초·exit0으로 통과했으며 새 유료 호출은 없습니다.

Controller22·activation40·trace12, executor/model/protocol, history95·hooks22·clock8·storage255·compression26·recorder1·V8cold1·gRPC24, WebSocket7·compact2, startup4/cloud2는 변경 없는 영역의 이전 근거를 재사용합니다. SDK272·그 안의 MCP239와 미실행 platform3도 이전 범위이며 source341에서 전부 다시 실행한 결과가 아닙니다. DB6개 readonly quick_check=ok·migration78 일치/additional0을 재사용했고 DB 갱신은 없습니다. 범위가 겹치는 수치를 합산하지 않습니다.

## 실패 진단과 다음 재시작

선행 source888은 실제 GUI/backend를 시작하고 요청1건을 시도했지만 step switching이 false였고 native Ares trace·Luna 근거가 없었습니다. 사용자의 Stop 후 turn interrupted를 확인했으나 native 취소 terminal proof는 확보하지 못했습니다. 이 실패 진단을 보존하며, 수정 source341의 GUI/provider 수용은 **NOT_RUN**입니다. 새 PC·remote CI도 NOT_RUN입니다.

다음 로컬 재시작은 dot에게 정확한 후보·diff·raw tests·apply/rollback 검토를 요청하고 답변을 받은 뒤 지적사항을 해결해야 가능합니다. 이 기록은 요청이나 답변이 이미 완료됐다고 주장하지 않습니다. 공개 push·tag·Release는 하지 않았으며 로컬 package 버전만0.1.0-preview.4입니다.

기존227/2·109/118/2 실패와 이후 predecessor229 결과는 당시 범위로 보존합니다. SQL78의 배포 CRLF/checksum 바이트, 원래 PowerShell 원인·역사적 manifest 해시 UNKNOWN, Windows symlink2/FIFO1 미실행과 일반 GUI native_task_delivery 미관측도 유지합니다. 과거452ms는 요청 elapsed이며 클릭 지연이 아닙니다. 품질·절감·독립 보안 감사·재현 가능한 바이너리를 주장하지 않습니다.

[검증](validation.md) · [빌드·복구](build.md) · [호환성](compatibility.md) · [설계](architecture.md) · [개인정보](privacy.md) · [English changes](../CHANGELOG.md)

## 보존된 과거 변경 기록

아래는 당시 checkpoint 원문이며 수정 후보 수용 결과가 아닙니다.

<details>
<summary>Preserved historical source snapshots (not current acceptance)</summary>

# 현재 로컬 검토 — 0.164 격리 소스 후보 (HOLD)

## 현재 0.164 Terra 후보

Terra 별칭·지원 강도 상속·일반 모델 우회를 추가하고 새 source/patch와 역사적 계약 근거를 분리해 결속했습니다. 고정5종 빌드와 새 정적320/458계약·Doctor/preflight1560은 통과했으며 native90검사와 compact6본문 미실행을 구분합니다. 운영·보안 설정·인증은 바꾸지 않았습니다. 전체 결과와 한계는 validation.md를 따릅니다.

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

</details>
