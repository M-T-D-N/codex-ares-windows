# Windows용 Codex Ares

**Codex 0.166.0-alpha.5.1 소스 프리뷰(`f602eec3…`), 검사 CLI `456a494b…`, Desktop 26.1027.3384.0(표시26.1027.30824)입니다.** 로컬 소스·빌드·정적 계약 검사가 통과했고, 이후 같은 native 해시의 작업표시줄 수동 기동을 관측했습니다. 현재 후보의 전용 GUI effort·Stop/회복·압축/재개, provider 수용과 새 PC 설치는 미검증입니다. 별도 로컬 작업의 자동 재시작은 실패했으며 해당 도우미는 소스 공개본에 포함하지 않습니다. [검증 범위](docs/validation.md)를 확인하세요.

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

선택한 Astra/Sol/Terra 메인 모델을 유지하면서 독립 GPT-6 Luna/High가 다음 generation의 추론강도를 평가합니다. medium/high/xhigh/max 중 catalog가 지원하는 값을 권고하며 현재 소유자·대화·turn·generation에만 유효합니다. 일반 Luna와 subagent에는 Ares 제어를 붙이지 않습니다. 수동 설정이 소유권을 가져가면 늦게 도착한 자동 판단은 이를 덮어쓰지 못합니다. 전용 Ares 자식 환경에서만 step switching 기본값을 제공하며 명시적 설정·managed opt-out은 보존합니다. Launcher는 Desktop 시작 전에 실제 전제조건을 조회합니다.

평가 실패·abstain 시 마지막 확정 xhigh/max가 현재 값·지원 목록에 맞으면 유지하고, 아니면 지원되는 High를 선택합니다. catalog가 부적합하거나 유효한 fallback이 없으면 자동 변경을 하지 않습니다. 평가기 실패에는 기존 cooldown(30·60·최대120초)을 적용합니다. 사용자의 임의 baseline을 항상 복원하는 동작은 아닙니다. 요청 effort나 응답 완료는 공급자 내부 연산량·답변 품질의 증거가 아닙니다.

## 빌드와 검사

lock으로 고정한 정확한 소스 사본을 사용합니다. Windows x64, Node 22+/npm, Git, Rust 1.99.1, Visual Studio x64 C++ 도구가 필요합니다. [lock](patches/codex/upstream.lock.json)은 공식 upstream `f79b26ccbb3116b052544666a181012fb45dc49b`, 누적 patch와 의존성을 고정합니다. [빌드 안내](docs/build.md)에 복원·재개·V8·SQL checksum 바이트·로컬 계약 검증 절차가 있습니다.

```powershell
npm run setup
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

빌드 기록은 실제5종 파일 해시를 소스 재검사·lock·도구·성공한 빌드 단계와 연결합니다. Bundle은 기록이 없거나 오래됐거나 실패·파일 불일치가 있으면 거부하며 기존 bundle을 덮어쓰지 않습니다. 복사한 파일도 다시 검사합니다. 서명된 빌드나 바이트 단위 재현성을 주장하지 않습니다.

Bundle 없는 Doctor 성공은 빌드 완료가 아닙니다. 실제 등록 Desktop과 정확히 연결된 로컬 protocol proof가 필요하며, 근거가 없거나 다르면 시작을 거부합니다. Setup·preflight는 GUI/provider 수용을 대신하지 않습니다. [업데이트·복구·제거](docs/build.md#update-recovery-and-removal) 절차에 따라 기존 작업을 정상 종료한 뒤 수용된 후보를 사용합니다.

## 현재 근거와 한계

Desktop 26.1027.3384.0의 새 로컬 proof는 검토된 Ares 차이를 투영한 stable320·experimental466 schema를 확인했습니다. CLI와 companion4개는 같은 고정 소스에서 빌드했습니다. 기본 npm test244/0/0과 bundle·Doctor·preflight1561은 Desktop 실행·모델 호출 없이 통과했습니다. SDK122·protocol317와 별도 생성기 실행·native 집중180·기본값17·startup/model63+6·mock app-server7은 각각의 범위이며, 중복을 합산한 전체 품질 총계나 GUI/provider 수용이 아닙니다.

역사적 source341 근거는 Desktop 26.1023.6123.0/native 0.165.0-alpha.1.2, stable320·experimental460, 기본 `npm test`236개·skip0, 같은 bundle의 mock SDK runtime46개입니다. Config17·기본 경로 RPC7·시작 보호18·실제 effective-config4도 해당 소스와 각각의 검사 범위에 속합니다. 다른 native/SDK 회귀는 변경 없는 영역에서만 이전 근거를 재사용합니다. 이 역사적 건수들은 sourcef602eec에서 실행한 결과나 제품 전체의 단일 총계가 아닙니다. [검증](docs/validation.md)·[호환성](docs/compatibility.md)을 따릅니다.

선행 `88886d7…`은 실제 GUI/backend를 시작하고 요청1건을 시도했지만 step switching이 꺼져 있었고 native Ares trace·Luna 근거가 없었습니다. 사용자의 Stop 후 turn interrupted를 확인했으나 native 취소 terminal proof는 확보하지 못했습니다. 이 실패 진단은 수정 후보의 수용이 아닙니다. 이전0.163 GUI Medium·재시작·압축/재개·Stop·회복은 당시 소스의 역사적 관측입니다. 그0.163 취소 요청의 elapsed452ms는 UI 클릭 반응시간이 아닙니다. 원래 PowerShell 오류 원인과 당시 launch-manifest 해시는 UNKNOWN입니다. 작은 품질·사용량 표본을 일반 동등성·절감·장기 안정성으로 확대하지 않으며 전체 native patch의 독립 검토는 미완료이며 native 전체 독립 보안 감사를 주장하지 않습니다.

[변경내역](CHANGELOG.md) · [설계](docs/architecture.md) · [개인정보](docs/privacy.md) · [이식 범위](patches/codex/PATCH_MAP.md)

`native_task_delivery` 수용에는 host 출처와 일치하는 수신자 신원이 필요합니다. 격리 RPC 근거는 일반 GUI generation 경로의 관측을 대신하지 않으며, 그 경로는 아직 미관측입니다.

대부분의 downstream 수정은 OpenAI Codex로 작성·검증했습니다. OpenAI 공식 제품이 아니며 [라이선스](LICENSE)·[제3자 고지](THIRD_PARTY_NOTICES.md)를 유지합니다. 소스 공개본에는 실행파일·도구·의존성 트리·인증·DB·사설 실행 근거가 없습니다. `0.1.0-preview.4`는 소스 전용 Technical Preview입니다. Release에서 정확한 게시 커밋·CI 결과·소스 자산 체크섬을 확인합니다.
