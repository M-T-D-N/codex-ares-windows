# Windows 版 Codex Ares

<p align="center">
  <img src="docs/assets/ares-banner.svg" alt="Codex Ares — 自动调节 Astra 和 Sol 的推理强度" width="1120" />
</p>

**选好模型，让 Ares 调整推理强度。**

查看文件、定位故障、权衡实现方案，下一步需要多少推理会随任务变化。Ares 在每次生成前重新评估当前状态，为所选模型设置下一次响应的推理强度。任务继续在同一段对话中完成。

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml"><img src="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml/badge.svg" alt="Source checks" /></a>
  <a href="docs/build.md"><img src="https://img.shields.io/badge/status-source_preview-d89a44" alt="Source preview" /></a>
  <a href="docs/compatibility.md"><img src="https://img.shields.io/badge/platform-Windows_x64-286b85" alt="Windows x64" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT_%2B_Apache--2.0-447a64" alt="MIT adapter + Apache-2.0 native patch" /></a>
</p>

<p align="center">
  <a href="#开始使用">开始使用</a> · <a href="#选择评估路径">选择路径</a> · <a href="docs/architecture.md">工作原理</a> · <a href="docs/pilot-results.md">测试结果</a>
</p>

> [!NOTE]
> **源码预览：** 使用固定依赖在本机构建。开始前请阅读[构建指南](docs/build.md)、[兼容范围](docs/compatibility.md)和[开发验证](docs/validation.md)。

开发说明：本衍生版本由 AI 生成，并由用户进行测试。请阅读[完整开发披露](#ai-开发披露)。

[更新内容与文档](docs/README.md) · [Change history](CHANGELOG.md)

## 为 Codex 增加什么

- **在任务进行中自动调整推理强度。** 从第一次生成开始，Ares 就会评估下一步，并可选择 `medium`、`high`、`xhigh` 或 `max`，减少逐步暂停任务、手动切换设置的操作。
- **继续使用你选择的模型。** Astra 仍是 Astra，Sol 仍是 Sol，Sol 6.1 仍是 Sol 6.1。强度变化应用于同一轮的下一次生成，现有工作代理也保留各自的职责。
- **评估延迟时继续工作。** 如果评估超时或评估器不可用，主模型会按基准强度继续执行，由控制器处理恢复。

你仍然可以选择普通 Astra、Sol、Sol 6.1 和 Luna。选择 Ares 路径后才会启动自动控制。

## 选择评估路径

| 在 Codex 中选择 | 执行任务的模型 | 判断推理强度的模型 |
|---|---|---|
| **Astra Ares** | GPT-6 Astra | 独立的 GPT-6 Luna / High |
| **Sol Ares** | GPT-6 Sol | 独立的 GPT-6 Luna / High |
| **Sol 6.1-Ares** | GPT-6.1 Sol | 独立的 GPT-6 Luna / High |

**Luna 负责评估，主模型负责工作。** Luna 路径使用现有的 Codex 登录。独立评估器不使用工具或 MCP，只读取当前判断所需的上下文，并给出推理强度建议。


## 开始使用

需要 **Windows x64**、Node.js 22+ 与 npm、Git、rustup、Visual Studio x64 C++ 构建工具，以及兼容的 Codex Desktop。当前 native 源码以 **Codex 0.162.0-alpha.17.2** 为基准。已有本地 Ares 运行环境通过了实际 Desktop 启动与 Luna 判断→主模型响应检查，请查看[兼容范围](docs/compatibility.md)。

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

安装命令会获取固定版本的源码和依赖，应用 native 补丁，并在本机构建 Ares。它会验证下载的 V8 文件，把可复用的构建缓存留在项目内。已安装的 Codex、认证信息和默认 Rust toolchain 保持不变。

构建完成后，请先结束正在进行的本地任务，再从应用菜单正常退出 Codex。在非管理员 PowerShell 中启动 Ares：

```powershell
.\scripts\start.ps1
```

在模型选择器中选择 **Astra Ares**、**Sol Ares** 或 **Sol 6.1-Ares** 即可使用 Luna 评估。

| 想要做什么 | 操作 |
|---|---|
| 查看当前 backend 与控制状态 | 运行 `.\scripts\status.ps1` |
| 回到固定推理强度 | 当前轮结束后选择普通模型 |
| 停止当前任务 | 使用 Codex 原有的 Stop 按钮 |
| 回到已安装的应用 | 正常退出，再按平常方式打开 Codex |

[完整构建指南与失败后的恢复步骤](docs/build.md)

## 在实际 Codex 任务中验证

已有试验覆盖了四条路径、同一轮内的强度切换、多段对话并行以及评估延迟后的恢复。[公开测试结果](docs/pilot-results.md)包括全部 12 组任务条件的对比，以及 51 次 Jev 判断的分析。

<details>
<summary><strong>测试结果与当前建议</strong></summary>

- **Astra：** 如果可以接受评估等待时间，可选择 Luna 辅助路径；重视延迟时，固定 Astra/xhigh 更简单。
- **Sol：** 根据已测任务，仍建议默认使用固定 Sol/High。
- **历史 Jev 试验：** 51 次判断全部转交给了主模型。Jev 路径已移除，当时的测量结果保留在试验报告中。

这些小规模对比验证了控制行为，并未证明普遍的费用节省或质量提升。结果也保留了失败、未观测项，以及自然升级和显式控制试验之间的区别。

</details>

当前提供的是**在本机构建的源码**。最近的修复让评估连接在启动宿主退出后继续运行，在保留当前要求的同时缩短过长评估输入，并修复开发构建中被中断的工具历史。实际 Sol 6.1-Ares 轮次应用了 Luna/High 的 Medium 建议并完成响应。[开发验证](docs/validation.md)区分本地运行证据与公开目录结构检查，也保留延迟与失败记录。

## 进一步了解

[架构](docs/architecture.md) · [构建与依赖](docs/build.md) · [兼容范围](docs/compatibility.md) · [隐私](docs/privacy.md) · [测试结果](docs/pilot-results.md)

README 提供英语、韩语、日语和简体中文版本。详细技术文档目前为英语。

## AI 开发披露

本衍生版本的大部分修改由 OpenAI Codex 根据用户提供的需求和多轮验收要求生成并修订。仓库所有者未手动审查源代码。验证依据是所有者 Windows/Codex 环境中的自动化测试和实际功能测试。尚未进行独立第三方代码审查或安全审计。

**简而言之：** AI 生成，用户测试，未经过手动代码审查。

## 上游与许可证

本适配器衍生自 [Astra-Ares](https://github.com/miuuyy/Astra-Ares)，并对 [OpenAI Codex](https://github.com/openai/codex)进行修改。准确的源码信息记录在 [lock](patches/codex/upstream.lock.json) 中。本项目不是 OpenAI 官方产品，也不代表上游承诺提供支持。

[许可证](LICENSE)保留 bridge 和新增适配器的 MIT 许可，以及 native 修改的 Apache-2.0 许可。[第三方声明](THIRD_PARTY_NOTICES.md)保留了原有条款。本源码包不分发 Desktop 应用或可执行依赖。
