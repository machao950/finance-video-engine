#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const scriptPath = path.resolve(process.argv[2] || 'script.md');
const outDir = path.resolve(process.argv[3] || path.dirname(scriptPath));
if (!fs.existsSync(scriptPath)) throw new Error(`脚本不存在: ${scriptPath}`);

const source = fs.readFileSync(scriptPath, 'utf8');
const title = source.match(/^title:\s*(.+)$/m)?.[1]?.trim()
  || source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  || path.basename(scriptPath, path.extname(scriptPath));
const factsPath = path.join(path.dirname(scriptPath), 'product-facts.md');
const factsText = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : '';
const factsAvailable = factsText.trim().length > 40;
const factLines = factsText.split(/\r?\n/).map(x => x.trim()).filter(x => /^[-*|]/.test(x) && x.length > 12);

function ngrams(text) {
  const normalized = text.replace(/\s+/g, '').toLowerCase();
  const grams = new Set(normalized.match(/[a-z0-9.$%+-]{2,}|[\u4e00-\u9fff]{2,4}/g) || []);
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= normalized.length - n; i++) {
      const part = normalized.slice(i, i + n);
      if (/^[\u4e00-\u9fff]+$/.test(part)) grams.add(part);
    }
  }
  return grams;
}

function bindFact(text) {
  const cueTerms = ngrams(text);
  let best = null;
  for (const line of factLines) {
    const lineTerms = ngrams(line);
    const score = [...cueTerms].filter(term => lineTerms.has(term)).length;
    if (!best || score > best.score) best = {line, score};
  }
  return best?.score >= 2 ? best.line.replace(/^[-*|]\s*/, '') : null;
}

const sections = [];
let currentSection = 'unsectioned';
for (const line of source.split(/\r?\n/)) {
  const heading = line.match(/^##+\s+(.+?)\s*$/);
  if (heading) currentSection = heading[1].trim();
  const cue = line.match(/\[\[cue:([^\]]+)\]\]\s*(.+)$/);
  if (cue) sections.push({cueId: cue[1].trim(), section: currentSection, text: cue[2].trim()});
}
if (!sections.length) throw new Error('未找到 [[cue:id]] 结构，不能建立可寻址动画计划。');

const RULES = [
  {type:'cashflow-waterfall', re:/自由现金流|现金流|利润.*(下降|增长)|营收.*利润|成本|费用|毛利|净利润|亏损|瀑布/i, engine:['d3','gsap'], grammar:'cashflow-waterfall', data:true},
  {type:'fund-flow', re:/资金|流入|流出|融资|申购|赎回|分配|储备|去向|交易量/i, engine:['d3','gsap'], grammar:'fund-flow', data:true},
  {type:'line-bar-data', re:/同比|环比|价格|涨幅|跌幅|利率|估值|ETF|季度|年度|趋势|K线|柱状|曲线|市值/i, engine:['d3','gsap'], grammar:'line-bar-reveal', data:true},
  {type:'risk-path', re:/诈骗|攻击|泄露|风险路径|传导|暴露|钓鱼|授权|假币|清算|爆仓/i, engine:['gsap'], grammar:'risk-path', data:false},
  {type:'tutorial', re:/教程|怎么|如何|检查|核验|清单|操作|步骤|助记词|地址|网络|钱包/i, engine:['gsap'], grammar:'tutorial-state-machine', data:false},
  {type:'timeline', re:/时间线|阶段|先是|随后|之后|此前|发展|首日|次日|第[一二三四五六七八九十0-9]+步/i, engine:['d3','gsap'], grammar:'timeline-focus', data:false},
  {type:'comparison', re:/区别|对比|相比|一边|另一边|多头|空头|BTC.*ETH|股票.*凭证|相对强弱/i, engine:['gsap'], grammar:'comparison-split', data:false},
  {type:'mechanism', re:/机制|为什么|意味着|底层|原理|链条|路径|因果|三层|逻辑/i, engine:['gsap','motion-canvas'], grammar:'motion-canvas-shot', data:false},
];

const entityCandidates = [...title.matchAll(/BTC|ETH|USDT|USDC|[A-Za-z][A-Za-z0-9.-]{2,}|[\u4e00-\u9fff]{2,8}/g)]
  .map(m => m[0]).filter(x => !/为什么|是什么|怎么办|有什么区别|新手|视频|分析/.test(x));
const heroLabel = entityCandidates[0] || '核心证据对象';
const heroId = `hero-${crypto.createHash('sha1').update(title).digest('hex').slice(0,8)}`;

const plans = sections.map((cue, index) => {
  const cueSemantic = `${cue.section} ${cue.cueId} ${cue.text}`;
  const complex = /(多层|复杂).*(机制|因果|传导|原理)|(机制|因果|传导|原理).*(多层|复杂)/i.test(cue.text)
    && cue.text.length >= 32;
  const procedural = /教程|核验|操作|步骤|按\s*[一二三四五六七八九十0-9]+\s*步|每一步/i.test(cue.text);
  const editorial = /interaction|comment|engagement/i.test(cue.cueId);
  const matched = (editorial ? {type:'hero-narrative', engine:['gsap'], grammar:'hero-morph', data:false} : null)
    || (complex ? RULES.find(rule => rule.grammar === 'motion-canvas-shot') : null)
    || (procedural ? RULES.find(rule => rule.grammar === 'tutorial-state-machine') : null)
    || RULES.find(rule => rule.re.test(cueSemantic))
    || (cue.section === 'unsectioned' ? RULES.find(rule => rule.re.test(title)) : null)
    || {
    type:'hero-narrative', engine:['gsap'], grammar:'hero-morph', data:false,
  };
  const engine = complex ? matched.engine : matched.engine.filter(x => x !== 'motion-canvas');
  const evidenceRequired = matched.data;
  const boundFact = evidenceRequired && factsAvailable ? bindFact(cue.text) : null;
  return {
    cueId: cue.cueId,
    section: cue.section,
    text: cue.text,
    semanticType: matched.type,
    engine,
    grammar: complex ? 'motion-canvas-shot' : matched.grammar,
    heroId,
    heroLabel,
    fromState: index === 0 ? '建立对象与核心问题' : `承接 ${sections[index - 1].cueId} 的可见状态`,
    toState: `${cue.cueId}: ${matched.type} 的证据或关系变化`,
    easing: matched.data ? 'power2.out' : 'expo.out',
    evidenceRequired,
    evidenceFile: evidenceRequired ? factsPath : null,
    evidenceStatus: evidenceRequired ? (boundFact ? 'bound-needs-human-check' : 'missing') : 'schematic-ok',
    sourceFields: boundFact ? [boundFact] : [],
    fallback: evidenceRequired ? '阻断：补齐来源字段；禁止虚构数据' : '标注“机制示意”，不显示虚构数值',
    rationale: complex
      ? '该cue解释复杂多层机制，普通DOM/SVG难以同时保持对象关系清晰，因此使用Motion Canvas制作关键镜头；其余镜头仍由GSAP/D3承担。'
      : `${matched.grammar}与该cue的${matched.type}语义匹配。`,
  };
});

const result = {
  schemaVersion: 1,
  generatedBy: 'finance-smart-motion-router',
  scriptPath,
  title,
  deterministicKey: crypto.createHash('sha256').update(source).digest('hex'),
  hero: {id: heroId, label: heroLabel, minimumChapterAppearances: Math.min(3, new Set(plans.map(p => p.section)).size)},
  facts: {path: factsPath, available: factsAvailable},
  cues: plans,
};

fs.mkdirSync(outDir, {recursive:true});
fs.writeFileSync(path.join(outDir, 'motion-plan.json'), `${JSON.stringify(result, null, 2)}\n`);
const rows = plans.map(p => `| ${p.section} | ${p.cueId} | ${p.semanticType} | ${p.engine.join(' + ')} | ${p.grammar} | ${p.heroLabel} | ${p.evidenceStatus} |`).join('\n');
const md = `# 智能动画计划\n\n- 标题：${title}\n- 脚本：\`${scriptPath}\`\n- 连续 Hero：\`${heroId}\`（${heroLabel}）\n- 数据事实文件：${factsAvailable ? `\`${factsPath}\`` : '缺失'}\n\n| 章节 | cue | 语义 | 引擎 | 动画语法 | Hero | 证据状态 |\n|---|---|---|---|---|---|---|\n${rows}\n\n## 执行规则\n\n- GSAP负责DOM/SVG连续对象、路径、遮罩和状态机。\n- D3只负责真实数据驱动的比例尺、折线、柱状、瀑布、时间轴和资金流布局。\n- Motion Canvas只用于计划中明确标记的复杂机制关键镜头，不得全片滥用。\n- \`needs-field-binding\` 必须在实现前绑定到 \`product-facts.md\` 的具体字段；\`missing\` 直接阻断。\n- 人工语义复核必做：关键词命中不代表镜头逻辑必然正确。\n`;
fs.writeFileSync(path.join(outDir, 'motion-plan.md'), md);
console.log(`已生成 ${plans.length} 个cue的动画计划: ${path.join(outDir, 'motion-plan.json')}`);
