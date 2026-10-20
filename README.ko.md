# Windows용 Codex Ares

<p align="center"><img src="docs/assets/ares-banner.svg" alt="Codex Ares — Astra와 Sol의 추론 강도 자동 조절" width="1120" /></p>

**모델은 고르세요. 추론 강도는 Ares가 조절합니다.**

Ares는 매 생성 단계 직전에 현재 작업을 확인하고, 선택한 모델의 다음 생성에 사용할 추론 강도를 판단합니다. 작업은 같은 대화에서 계속됩니다.

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

**0.1.0-preview.2 소스 프리뷰:** 공식 Codex **0.163.0** 위에 기존 Ares 제어를 이식했습니다. 대응하는 비공개 실행본에서 GUI Stop·같은 대화 회복·자동압축과 재개를 확인했습니다. 이번 공개 폴더 그대로의 새 GUI/provider 수용 검증은 미실시이며, 공개 소스 복원 9,193파일/mode와 로컬 검사95개가 통과했습니다. 각 근거의 범위는 [검증 안내](docs/validation.md)를 따릅니다.

## 작동 방식

| Codex에서 선택 | 작업하는 모델 | 강도를 판단하는 모델 |
|---|---|---|
| Astra Ares | GPT-6 Astra | 독립 GPT-6 Luna / High |
| Sol Ares | GPT-6 Sol | 독립 GPT-6 Luna / High |
| Sol 6.1-Ares | GPT-6.1 Sol | 독립 GPT-6 Luna / High |

Luna는 다음 생성에 필요한 강도로 `medium`, `high`, `xhigh`, `max`를 권고할 수 있습니다. 선택한 메인 모델은 유지됩니다. 판단은 해당 생성 한 번에만 속하며, 이전 판단을 새 판단으로 재사용하지 않습니다. 평가 지연·실패 시 메인은 기준 강도로 계속할 수 있고 제어기는 회복을 처리합니다.

일반 모델은 계속 선택할 수 있습니다. 일반 Luna와 subagent에는 Ares 제어를 붙이지 않습니다. 내부 composer 추천은 수락된 metadata로 평가에서 제외하며, 사용자 본문에 같은 단어가 있다는 이유로 제외하지 않습니다. 별도 평가자는 기존 Codex 로그인을 사용하고 도구·MCP에는 접근하지 않습니다.

## 시작하기

이 프리뷰는 **PC에서 직접 빌드하는 소스**입니다. Windows x64, Node.js 22+/npm, Git, rustup, Visual Studio x64 C++ 빌드 도구와 호환되는 등록 Codex Desktop이 필요합니다. 관측한 Desktop은 **26.1013.4894.0**이며 시작 시 [소스 lock](patches/codex/upstream.lock.json)의 정확한 버전을 검사합니다.

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

사용할 소스 revision 또는 archive를 확인하고 체크섬을 보관하세요. Setup은 고정된 Codex 원본을 복원하고 누적 patch를 한 번 적용한 뒤 의존성과 CLI·companion 네 개를 빌드합니다. 설치 Desktop·인증·기본 Rust toolchain은 유지합니다. 설치·업데이트 전 [빌드 안내](docs/build.md)를 읽으세요. 새 PC 설치와 프로젝트 내부 Rust 설치 분기는 수용 검증하지 않았습니다.

빌드 후 진행 중인 작업을 마치고 앱 메뉴에서 Codex를 정상 종료합니다. 일반 권한 PowerShell에서 실행합니다.

```powershell
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
.\scripts\start.ps1
```

Preflight는 Desktop이나 모델을 시작하지 않고 입력을 검사합니다. 시작 스크립트는 MSIX 전환 전에 Node를 해석하고 완료 receipt와 실제 Desktop/backend 신원을 확인합니다. 완료가 없거나 불명확하면 기동 성공으로 보지 말고 안내된 receipt를 확인한 뒤 재시도를 판단하세요. 이 구조 자체가 공개 폴더의 GUI 수용 검증을 대신하지는 않습니다.

모델 선택에서 Ares 경로를 고릅니다. `.\scripts\status.ps1`로 backend·제어 상태를 조회할 수 있습니다. `current`는 프로세스 신원과 최근 상태 시각이 일치해야 하며, 과거 receipt만으로 현재 제어가 실행 중이라고 판단하지 않습니다.

| 목적 | 방법 |
|---|---|
| 고정 강도로 돌아가기 | 턴 경계에서 일반 모델 선택 |
| 현재 작업 멈추기 | Codex 기본 Stop 사용 |
| 설치본으로 돌아가기 | 앱 정상 종료 후 설치 Codex 실행 |
| 업데이트·복구·제거 | [수명주기 안내](docs/build.md#update-recovery-and-removal) 확인 |

## 확인한 범위와 한계

대응하는 비공개 0.163 실행본에서 GUI Stop으로 요청이 취소됐고(요청 로그 elapsed 452ms이며 클릭 반응시간 측정이 아님) 취소 턴의 추가 Main 생성은 0건이었습니다. 같은 대화의 후속 요청은 3,001ms에 완료되고 기대한 표식을 화면에서 확인했습니다. 같은 고정 native 소스의 앞선 GUI Medium·자동압축·재개 검사도 통과했습니다. 제한된 기능 관측이며 장기 안정성 보장은 아닙니다.

수락된 작업 전달 입력은 격리 RPC에서 확인했습니다. 일반 GUI에서 그 전달 경로가 생성되는 과정은 관측하지 않았습니다. 원래 PowerShell 오류의 원인과 당시 launch manifest의 바이트 해시는 UNKNOWN입니다. GUID 완료·오류 전파와 backend 신원 연속성 수정은 별도 근거이며 과거 오류의 원인을 입증하지 않습니다.

[과거 파일럿](docs/pilot-results.md)은 소규모 업무 비교·실패와 제거된 Jev 경로의 측정을 보존합니다. 과거 파일럿과 이후의 작은 품질 표본은 보편적 품질 동등성·비용 절감·장기 안정성을 입증하지 않습니다. 이번 공개 준비에는 새 유료 시험이 포함되지 않습니다.

[변경점](docs/changes.ko.md) · [호환성](docs/compatibility.md) · [빌드](docs/build.md) · [검증](docs/validation.md) · [구조](docs/architecture.md) · [개인정보](docs/privacy.md)

## AI 개발 고지·출처

다운스트림 변경 대부분은 사용자 요구와 수용 피드백에 따라 OpenAI Codex가 작성·수정했습니다. 저장소 소유자는 소스를 직접 수동 검토하지 않았습니다. 검증은 소유자의 Windows/Codex 환경에서 수행한 자동 검사와 기능 시험을 근거로 하며, 독립적인 제3자 코드·보안 감사를 주장하지 않습니다.

[Astra-Ares](https://github.com/miuuyy/Astra-Ares)의 파생 어댑터이며 [OpenAI Codex](https://github.com/openai/codex)를 수정합니다. OpenAI 공식 제품이 아닙니다. [LICENSE](LICENSE)는 어댑터의 MIT와 native 변경의 Apache-2.0을 보존합니다. [제3자 고지](THIRD_PARTY_NOTICES.md)를 확인하세요. 소스 배포물에는 native 실행파일·설치 Desktop·toolchain·의존성 트리·비공개 실행 근거를 넣지 않습니다.
