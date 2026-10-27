# Windows용 Codex Ares

**현재 0.164 Terra 로컬 후보:** 고정 소스로 CLI와 companion 4종을 빌드했고 새 stable 320/experimental 458 export·로컬 proof·Doctor·1560 입력 preflight를 통과했습니다. 최종 Node package-script 본문은 196/196개 통과했습니다(npm 실행 파일 없음). native 모델관리 63·controller 22·dispatch 5가 통과했으며 compact/재개 6건은 플랫폼 제한 skip이므로 NOT_RUN입니다. 앱 실행·모델 요청은 없고 공개 제출 및 운영 전환은 최종 검토 대기입니다. 아래 과거 결과는 당시 소스에만 적용됩니다.

**0.164 로컬 소스·빌드 검토 후보입니다. 공개 게시와 운영 전환은 보류합니다.** 보존된0.163 공개본과 별개이며, [현재 검증](docs/validation.md)은 소스 복원·빌드·정적 계약·실사용 수용을 구분합니다.

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

선택한 Astra/Sol/Terra 메인 모델을 유지하면서 독립 GPT-6 Luna/High가 다음 generation의 추론강도를 평가합니다. medium/high/xhigh/max 권고는 현재 작업 소유자와 generation에 결속됩니다. 일반 Luna와 subagent에는 Ares 제어를 붙이지 않습니다. 평가 실패·abstain 시 native fallback은 마지막 확정 xhigh/max가 현재 값과 지원 목록에 모두 맞으면 유지하고, 아니면 지원되는 High를 선택합니다. 수동 설정 변경이 소유권을 가져가면 자동 제어를 포기합니다. catalog가 부적합하거나 High와 유지 가능한 강도가 모두 없으면 자동 변경을 하지 않으며, 평가기 실패에는 기존 실패 cooldown(30·60·최대120초)을 적용합니다. 사용자가 고른 임의 baseline을 항상 복원하는 동작은 아닙니다. 응답 완료나 요청 effort만으로 품질·공급자 내부 실행 강도를 증명하지 않습니다.

보존된 rev4 선행본의 upstream은 `6905ecede7816e91373e9eabda3f6b0368fc747b`, 누적 patch는68경로, Rust1.99.1·V8152.2.0입니다. 일반 파일9,455개의 source identity는 `1cd0679d81f0e4d34fc9212ed5f3089fc072b4591a9f460cbfdff4aacd55d7ca`입니다. 검토된 f672db80…의 합성 검사 식별자2개를 비식별 값으로 바꿨습니다. 이후 실제 CLI 컴파일 실패를 해결하기 위해 TUI3경로에 정확한 대화 알림 라우팅·사용자 baseline 보존과 직접 회귀검사를 반영했습니다. 최초 실패 기록은 보존합니다. [실제 이식 범위](patches/codex/PATCH_MAP.md)를 확인하세요.

## 빌드와 검사

검토된 정확한 소스 사본을 사용합니다. Windows x64, Node22+/npm, Git, Rust1.99.1, Visual Studio x64 C++ 도구가 필요합니다. [빌드 안내](docs/build.md)에 archive·Cargo.lock·V8 고정값과 복원·재개 명령이 있습니다.

```powershell
npm run setup
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

Doctor의 bundle 없는 성공은 빌드 완료가 아닙니다. 정확한 Desktop 계약 근거가 없거나 달라지면 시작을 거부하며 예외로 우회하지 않습니다. 이번 검증은 앱 실행·추가 모델 호출을 하지 않습니다. 운영본과 DB 복구점을 보존하고 [업데이트·복구·제거](docs/build.md#update-recovery-and-removal) 절차를 따릅니다.

## 역사적 근거와 한계

이전 비공개0.163 source185ee634에서 GUI Medium·재시작 유지·압축/재개·Stop·같은 대화 회복을 확인했습니다. 취소 요청 로그 elapsed452ms는 UI 클릭 반응시간 측정값이 아닙니다. RPC 입력 전달과 일반 GUI 입력 생성은 별개이며 후자는 관측하지 못했습니다.

원래 PowerShell 오류 원인과 과거 launch-manifest 바이트 해시는 UNKNOWN입니다. 이후 GUID 오류 전파·신원 검증 수정으로 그 원인을 확정하지 않습니다. 작은 품질 표본을 일반 동등성·비용 절감으로 확대하지 않습니다. native patch 전문의 독립 검토, fresh-PC 설치, 새 공개 GUI/provider 수용은 미완료입니다. 과거95/96/101/112개 단위 검사·105개 PowerShell 검사는 당시 후보의 기록입니다.

[변경내역](CHANGELOG.md) · [호환성](docs/compatibility.md) · [설계](docs/architecture.md) · [개인정보](docs/privacy.md)

대부분의 downstream 수정은 OpenAI Codex로 작성·검증했습니다. 독립 보안 감사를 주장하지 않습니다. OpenAI 공식 제품이 아니며 [라이선스](LICENSE)와 [제3자 고지](THIRD_PARTY_NOTICES.md)를 유지합니다. 실행파일·도구·의존성 트리·인증·DB·사설 로그는 소스 공개 목록에서 제외합니다.
