# Windows용 Codex Ares

<p align="center">
  <img src="docs/assets/ares-banner.svg" alt="Codex Ares — 선택한 Astra·Sol을 유지하고 매 generation 사이에서 최신 상태로 추론 강도를 판단" width="1120" />
</p>

선택한 Astra 또는 Sol 모델을 유지하면서 같은 turn의 generation 사이에서 추론 강도를 조절하는 어댑터입니다. 독립 Luna High 평가 또는 Jev→현재 Main 검토를 선택할 수 있습니다.

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml"><img src="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml/badge.svg" alt="소스 자동 검사" /></a>
  <a href="docs/build.md"><img src="https://img.shields.io/badge/status-source_preview-d89a44" alt="소스 preview" /></a>
  <a href="docs/compatibility.md"><img src="https://img.shields.io/badge/platform-Windows_x64-286b85" alt="Windows x64" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT_%2B_Apache--2.0-447a64" alt="어댑터 MIT · native patch Apache-2.0" /></a>
</p>

<p align="center">
  <a href="#준비와-설치">시작하기</a> · <a href="#어떤-모드를-고를까">모드 선택</a> · <a href="docs/architecture.md">작동 구조</a> · <a href="docs/pilot-results.md">파일럿 결과</a>
</p>

> [!IMPORTANT]
> 비공식 실험용 소스 preview이며 수정된 Codex backend가 필요합니다.
> 소스 복원, 본체·동반 실행파일 빌드와 무모델 패키지 검사가 통과했습니다.
> 이번 공개 빌드의 새 Desktop GUI 시험은 수행하지 않았습니다.
> [빌드 상태](docs/build.md)를 확인하세요.

개발 안내: 이 다운스트림은 AI가 생성하고 사용자가 시험했습니다. [전체
고지](#ai-개발-고지)를 확인하세요.

## 제공 기능

**Main 모델은 그대로, 다음 generation의 추론 강도는 현재 상태에 맞게 조절합니다.**

| 선택 | 유지하는 Main | 판단 |
|---|---|---|
| Astra Ares | GPT-6 Astra | 독립 GPT-6 Luna High |
| Sol Ares | GPT-6 Sol | 독립 GPT-6 Luna High |
| Astra Jev Main | GPT-6 Astra | Jev 또는 같은 Main의 검토 |
| Sol Jev Main | GPT-6 Sol | Jev 또는 같은 Main의 검토 |

매 generation 경계에서 최신 상태를 평가합니다. Jev가 판단을 Main에 넘기면 기존 Main이 내부 요청으로 다음 generation의 강도를 바꿀 수 있습니다. 선택한 모델을 바꾸거나 새 turn을 요구하지 않습니다. 평가기 지연·장애 시에는 기준 강도로 작업을 이어가며 회복을 시도합니다.

일반 Astra·Sol·Luna와 기존 worker는 자동 편입되지 않습니다. no-tools 격리는 Luna 평가자에게만 적용합니다. 제품의 연속 작동에 시험 호출 횟수 상한을 넣지 않았습니다. [구조 설명](docs/architecture.md).

## 준비와 설치

Windows x64, Node.js 22+/npm, Git, rustup, Visual Studio x64 C++ 빌드 도구가 필요합니다. 정확한 소스·컴파일러 버전은 [빌드 lock](patches/codex/upstream.lock.json)에 고정되어 있습니다.

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

고정 소스를 확인하고 누적 patch를 한 번 적용한 뒤 npm 의존성·정확한 Rust를 준비하고 빌드·묶음 생성을 진행합니다. 필요한 V8 라이브러리와 대응 바인딩은 고정된 Codex 공식 배포처에서 받아 해시를 검증합니다. Rust가 없으면 프로젝트의 build 폴더에 설치하며 이용자의 기본 toolchain·Codex 설치·인증은 바꾸지 않습니다. 소스 preview이며 실행파일 배포본은 아닙니다.

모델 호출 없이 소스와 국소 검사를 확인하려면:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm test
.\scripts\setup.ps1 -RestoreOnly
.\scripts\doctor.ps1
```

<details>
<summary><strong>빌드 전에 확인할 내용</strong></summary>

이 preview는 native 코드를 PC에서 직접 빌드합니다. 위 준비 도구와 호환되는 Codex Desktop 설치본이 필요하며, `npm run setup`은 Desktop 원클릭 설치기가 아닙니다. 빌드 캐시는 프로젝트 폴더에 보관하고 재사용할 수 있습니다.

[빌드 안내](docs/build.md) · [호환 범위](docs/compatibility.md)

</details>

## 호환 빌드에서 사용하기

호환 실행 묶음이 준비되면 진행 중인 로컬 작업을 마치고 앱 메뉴에서 Desktop을 정상 종료합니다. 일반 권한 PowerShell에서 `.\scripts\start.ps1`을 실행하고 위의 네 경로 중 하나를 고릅니다. `.\scripts\status.ps1`로 실제 backend와 제어 상태를 확인합니다. 설치 Desktop은 그대로 사용하며 지원 조합은 [호환 문서](docs/compatibility.md)에 있습니다.

Luna는 정상 Codex 인증 loader를 사용하며 Jev 키가 필요 없습니다. Jev 선택 때만 개인 환경의 `TYPESAFE_API_KEY` 또는 `TYPESAFE_API_KEY_FILE`을 사용합니다. 제한된 판단 입력이 TypeSafe로 전송되며 비용이 발생할 수 있습니다. 키를 저장소·명령줄에 넣지 마세요. `.env.example`은 변수명 안내이며 `.env`를 자동으로 읽지 않습니다. [개인정보 안내](docs/privacy.md).

일반 Main 모델을 turn 경계에서 선택하면 자동 판단을 해제합니다. 진행 중 turn은 정상 Stop으로, 평가자와 bridge 전체는 앱 메뉴 정상 종료로 마칩니다. 설치 앱을 평소대로 열면 일반 실행으로 돌아갑니다. 강제 종료는 사용하지 않습니다.

## 어떤 모드를 고를까

| Main / 경로 | 현재 권고 | 고려할 점 |
|---|---|---|
| **Astra** | Luna 판단 경로가 후보 | 평가 지연이 중요하면 일반 Astra/xhigh가 간단합니다. |
| **Sol** | 일반 Sol/High | 현재 근거에서 유지하는 기본 추천입니다. |
| **Jev / 양쪽 Main** | 선택형 실험 | 업무 판단 51건이 현행 gate에서 모두 이관되어 기본 추천은 보류합니다. |

이는 제한된 운영 권고이며 절감률·품질 우위를 입증한 결론은 아닙니다. 필요한 분은 [파일럿 결과와 한계](docs/pilot-results.md)에서 업무 12조건, 강도 제어·회복과 Jev 분석을 볼 수 있습니다. 파일럿 데이터나 재실행 도구는 설치·검사의 의존성이 아닙니다.

## 개발 검증

합성 입력을 쓰는 작은 회귀검사 3파일이 경로 선택, 취소·회복, 상태, 인증정보 처리, 인증된 로컬 연결을 확인합니다. 유료 모델은 호출하지 않습니다. [검증 범위](docs/validation.md).

실행 코드는 `src/`, 진입점은 `scripts/`, 누적 native patch와 고정 입력은 `patches/codex/`, 안내는 `docs/`에 있습니다. 파일럿 로그·대화 원문·실행 기록·빌드 캐시·바이너리는 공개 묶음에 넣지 않습니다.

## 필요한 문서 찾기

| 확인할 내용 | 문서 |
|---|---|
| 설치 준비·의존성 다운로드·실패 후 빌드 재개 | [빌드 안내](docs/build.md) |
| 지원 Desktop·backend 조합 | [호환 범위](docs/compatibility.md) |
| generation 제어·평가·장애 회복 | [작동 구조](docs/architecture.md) |
| 통과한 검사와 아직 검증하지 않은 범위 | [검증 범위](docs/validation.md) |
| 업무 비교와 Jev gate 분석 | [파일럿 결과](docs/pilot-results.md) |
| 인증정보·로컬 연결·외부 요청 | [개인정보 안내](docs/privacy.md) |

## AI 개발 고지

다운스트림 변경 대부분은 사용자가 제공한 요구사항과 반복적인 수용 요청에 따라
OpenAI Codex가 작성·수정했습니다. 저장소 소유자는 소스 코드를 직접 읽거나
검토하지 않았습니다. 검증은 소유자의 Windows/Codex 환경에서 수행한 자동화
테스트와 실제 기능 시험을 근거로 합니다. 독립적인 제3자 코드 검토나 보안 감사는
수행되지 않았습니다.

**요약:** AI가 생성하고 사용자가 시험했으며, 수동 코드 리뷰를 거치지 않았습니다.

## Upstream 표기와 라이선스

[Astra-Ares](https://github.com/miuuyy/Astra-Ares)의 파생 어댑터이며 [OpenAI Codex](https://github.com/openai/codex)를 수정합니다. 정확한 원본 정보는 [lock](patches/codex/upstream.lock.json)에 있습니다. OpenAI 공식 제품이나 upstream의 지원 약속이 아닙니다.

[라이선스](LICENSE)는 bridge·신규 어댑터의 MIT와 native 변경의 Apache-2.0을 유지합니다. [제3자 고지](THIRD_PARTY_NOTICES.md)에 원본 조건을 보존했습니다. 설치 Desktop과 실행파일 의존성은 이 소스 묶음으로 재배포하지 않습니다.
