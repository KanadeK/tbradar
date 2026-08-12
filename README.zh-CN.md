# TBRadar

[![CI](https://github.com/KanadeK/tbradar/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/tbradar/actions/workflows/ci.yml)
[![Pages](https://github.com/KanadeK/tbradar/actions/workflows/pages.yml/badge.svg)](https://github.com/KanadeK/tbradar/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-2457d6.svg)](LICENSE)

**把自己的待读清单对准书架，找出眼前那些早就想读的书。照片始终留在浏览器里。**

[在线使用](https://kanadek.github.io/tbradar/) · [English](README.md) · [验收与修复](docs/acceptance.md) · [选题调研](docs/research.md)

![TBRadar 将待读清单与书架扫描结果匹配](docs/tbradar-workbench.png)

## 它解决什么问题

多数书脊扫描工具想识别书架上的全部图书，或基于 AI 再推荐新书。TBRadar 只回答一个更具体、更适合旧书店、图书馆书展和家中藏书架的问题：

> 眼前这些书里，哪些已经在我的待读清单上？

导入 Goodreads、StoryGraph 或普通 CSV 清单，拍一张书架照片，TBRadar 会把每个目标书名归为 **Found**、**Review** 或 **Missing**。每项结果都保留匹配到的 OCR 文本和置信度，模糊识别可以人工复核，不会伪装成确定答案。

## 已经真实可用的能力

- 导入 Goodreads、StoryGraph、普通 CSV，或按行粘贴书名与作者。
- 识别常见书架和阅读状态字段，仅保留 to-read、want-to-read、TBR、wishlist、unread 等目标行。
- 在浏览器内运行真实 Tesseract.js OCR；书架模式会检查 0°、90°、270° 三个方向的竖排书脊。
- 用字符相似度、词元覆盖率、词元精度和作者姓氏加分来容忍 OCR 噪声。
- 支持修改 OCR 文本、调整阈值后立即重新匹配。
- 导出带版本号的 JSON 扫描凭据，或便于继续处理的 CSV 报告。
- 在浏览器本地保存清单、OCR 文本和阈值；原始照片不会持久化。
- 可安装为 PWA，并预缓存应用外壳、固定版本的 OCR Worker、兼容 WASM Core 和英语模型。

项目没有后端、账号、遥测、推荐接口，也没有用写死结果冒充 OCR 的演示路径。

## 本地运行

需要 Node.js 24+ 与 npm 11+。

```bash
git clone https://github.com/KanadeK/tbradar.git
cd tbradar
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173`，点击 **Try sample**，再点 **Scan shelf**。合成书架样例会走过与真实照片完全相同的 Tesseract.js 路径。

约 15 MB 的 OCR 运行包已经固定在本仓库，并与应用从同一来源提供，不依赖第三方运行时 CDN。PWA 预缓存完成后可以离线识别。完整边界见 [隐私说明](docs/privacy.md) 和 [第三方归属](THIRD_PARTY_NOTICES.md)。

## 输入兼容性

| 来源           | 识别字段                                              | 行为                                   |
| -------------- | ----------------------------------------------------- | -------------------------------------- |
| Goodreads CSV  | `Title`、`Author`、`Exclusive Shelf` 或 `Bookshelves` | 存在可识别书架值时，仅保留想读或未读行 |
| StoryGraph CSV | `Title`、`Authors`、`Read Status`                     | 存在可识别状态时，仅保留想读或未读行   |
| 普通 CSV       | `Title` 或 `Book Title`，可选 `Author`、`Status`      | 导入有效标题，并按可选状态做同样过滤   |
| 粘贴文本       | `书名`、`书名 \| 作者` 或 `书名 - 作者`               | 每行一本，自动去重                     |

解析器会移除 UTF-8 BOM、报告格式错误、忽略空标题并生成稳定的本地 ID。可直接使用 [`public/examples`](public/examples) 中的样例。

## 验收

首次安装浏览器：

```bash
node node_modules/@playwright/test/cli.js install chromium
```

完整验证：

```bash
npm run verify          # 静态、格式、Lint、类型、覆盖率、构建、流程 E2E
npm run test:e2e:ocr   # 真实 OCR 合成书架
npm run package        # 版本化网页 ZIP 与 SHA256SUMS
npm run package:verify # 相隔两次打包仍逐字节一致
```

在干净工作区执行最终门禁：

```bash
npm run release:check
```

每条命令的成功证据、常见失败和修复步骤都写在 [docs/acceptance.md](docs/acceptance.md)。

## 已知边界

- OCR 仍受对焦、灯光、反光、书脊尺寸和字体影响；Review 是正常结果，必须允许人工确认。
- 当前 OCR 配置使用英语模型。Unicode 书名可以导入；其他语言模型尚未在界面中开放。
- 工具识别印刷文字，不通过封面或条码猜测具体版本。
- 很宽的书架分成两三张近照，通常比一张远景更可靠。
- 浏览器存储不是备份；重要结果请导出凭据。

## 架构与贡献

核心分层与取舍见 [docs/architecture.md](docs/architecture.md)，研究和不重复性边界见 [docs/research.md](docs/research.md)。欢迎提交新的 CSV 适配器、合成回归书架、无障碍改进和可复现的 OCR 边界案例，参与前请读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE) © 2026 KanadeK。生成式首图的来源说明见 [docs/asset-provenance.md](docs/asset-provenance.md)。
