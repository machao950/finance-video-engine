# 财经视频组件库

这是财经视频引擎视频的 HyperFrames 生产级财经组件库。它把长视频固定为 6 个可独立 seek、检查和替换的子合成，并提供 7 个不携带旧数据的财经组件。

## 一条命令启用智能动画

```bash
bash ./财经视频组件库/启用智能动画.sh /绝对路径/项目/script.md
```

命令会固定安装/检查 GSAP、D3、Motion Canvas，解析标题、章节、cue与完整字幕语义，并生成 `motion-plan.json`、`motion-plan.md`、`animation-preflight.md`。检查失败时不得开始HTML演示或MP4合成。动画触发规则见 `motion-grammars/README.md`。

## 6 章节与组件路由

| 章节 | 任务 | 默认组件 |
|---|---|---|
| 01-opening | 结论、估值位置、主问题 | `valuation-curve` |
| 02-facts | 实际值与市场预期的偏差 | `earnings-expectation-gap` |
| 03-mechanism | 从事实到价格的传导链 | `causal-flow` |
| 04-countercase | 多头与空头的最强证据 | `bull-bear-comparison` |
| 05-scenarios-action | 基准/乐观/风险情景与执行清单 | `three-scenarios` + `action-checklist` |
| 06-closing | 回答标题、失效条件、字幕与来源 | `caption-source` |

## 直接调用

1. 复制 `six-section-template/` 到新项目，在目录内执行 `npm install`。
2. 根据真实 `timeline.json` 修改 `index.html` 中每个宿主的 `data-start` 和 `data-duration`。
3. 通过 `data-variable-values` 注入本期的标题、数据、单位、日期、来源、触发条件和失效条件。
4. 运行 `npm run check` 和 `npm run snapshot`，逐章目视检查。

单个组件的调用格式：

```html
<div
  data-composition-id="valuation-curve"
  data-composition-src="components/valuation-curve.html"
  data-start="0"
  data-duration="8"
  data-track-index="1"
  data-width="1920"
  data-height="1080"
  data-variable-values='{"title":"真实标题","source":"来源：公司公告"}'
></div>
```

## 强制边界

- 组件只复用结构和动画语法，不复用旧公司名、数字、来源和结论。
- 未在 `product-facts.md` 核对的值不得注入。缺数据时显示“数据待注入”，不用虚构数字撑画面。
- 时长以真实配音时间轴为准；同一时间输入必须得到同一画面。
- 背景仍只能来自财经视频引擎固定背景图库；该库只负责前景证据与合成。
- 长视频保持 1—2 个 Hero 对象跨章连续，不得做成整页淡入淡出的 PPT。
- 正式片不显示右上章节号、进度条、常驻来源角标或制作界面。
