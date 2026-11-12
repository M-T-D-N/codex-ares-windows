# Windows용 Codex Ares

**정확한 Desktop 26.1106.6628.0용 Codex 0.167.0-alpha.4.1 소스 프리뷰(`0.1.0-preview.5`)입니다.** 전체 소스 복원과 공개 로컬 회귀를 검증했고, 별도의 private 운영에서 같은 native 입력의 자동 재시작과 인증된 서비스 초기화 반복이 통과했습니다. 공개 layout의 GUI/provider·새 PC 수용을 뜻하지 않습니다. [검증](docs/validation.md)에 각 범위와 게시 전 CI snapshot을 구분합니다. 설치 runtime·사설 수용 데이터는 배포하지 않습니다.

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md)

선택한 Astra/Sol/Terra Main을 유지하면서 독립 GPT-6 Luna/High가 지원되는 medium/high/xhigh/max 중 다음 generation의 추론 강도를 권고합니다. 일반 Luna와 subagent에는 Ares 제어를 붙이지 않습니다. 대화·turn·generation의 소유권을 확인하며 native 현재 턴 API가 수락한 수동 설정은 늦은 자동 판단보다 우선합니다. 현재 Desktop GUI의 진행 중 effort 조작을 검증했다는 뜻은 아닙니다. 평가 실패 시 기존 지원 fallback과 cooldown을 쓰며 임의 baseline 복원·공급자 내부 연산·품질·비용 절감을 일반 보증하지 않습니다.

## 빌드와 검사

[공개 lock](patches/codex/upstream.lock.json)은 공식 upstream `d2c035639366e0bf2c316aa2065c24aabc12bcdc`, archive·누적 patch·전체 파일 manifest를 고정합니다. patch199경로(수정178·신규21) 중 SQL78개는 배포된 CRLF checksum 바이트를 보존합니다. 복원 대상은 regular file9,930개와 별도 확인하는 materialized link1개입니다. [빌드 안내](docs/build.md)의 Windows x64·Node22+/npm·Rust1.99.1·Visual Studio·V8 조건을 따릅니다.

```powershell
npm run setup
.\scripts\doctor.ps1
.\scripts\start.ps1 -PreflightOnly
```

새 로컬 빌드는 자신의 source·lock·도구·CLI/companion4개 해시를 연결하고 bundle과 실제 등록 Desktop의 fresh protocol proof를 만들어야 합니다. `bundle:not_built`인 Doctor 성공은 소스 검사이며 빌드 완료가 아닙니다. Preflight는 실제 기동과 별개입니다. 이전·인접 Desktop/companion 버전 허용 범위를 넓히지 않았습니다. [업데이트·복구](docs/build.md#update-recovery-and-removal) 순서와 기존 작업의 정상 종료를 지킵니다.

## 근거와 한계

전체 내용·Git mode·tree 복원, 공개 mock/정적 회귀와 로컬 빌드·protocol 검사, private 동일-native 운영을 [검증](docs/validation.md)에서 분리합니다. 정상 종료·capture·verify·start 자동 시퀀스와 이후 인증된 서비스 초기화 2회, 일반 shell·내장 patch 검사가 통과했습니다. 정확한 게시 커밋의 CI는 날짜가 고정된 게시 전 snapshot에서 NOT_RUN이며 실제 커밋·CI 결과는 Release에서 확인합니다. 일반 GUI native_task_delivery·새 PC 설치·Windows 물리 symlink·전체 독립 보안 및 바이너리 재배포 감사는 미검증입니다. 기존 preview.1–4 기록은 각각의 역사적 source에만 적용합니다.

상세 문맥 trace는 정확한 대화 하나에만 opt-in합니다. 기존 인증·provider route를 쓰며 독립 평가기에는 tool/MCP를 주지 않습니다. [개인정보](docs/privacy.md)·[LICENSE](LICENSE)·[제3자 고지](THIRD_PARTY_NOTICES.md)·[patch 범위](patches/codex/PATCH_MAP.md)·[변경내역](CHANGELOG.md)을 확인하세요. 실행파일·의존성·인증·DB·실제 대화·로그·복구 세트·사설 Git 이력은 공개하지 않습니다. 대부분의 downstream 작업은 OpenAI Codex로 작성했으며 OpenAI 공식 제품이 아닙니다.
