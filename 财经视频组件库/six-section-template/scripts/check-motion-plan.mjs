#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const planPath = path.resolve(process.argv[2] || 'motion-plan.json');
const outDir = path.dirname(planPath);
const failures = [];
const warnings = [];
if (!fs.existsSync(planPath)) throw new Error(`缺少动画计划: ${planPath}`);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.cues) || !plan.cues.length) failures.push('没有cue动画计划');
const grammars = new Set(plan.cues.map(c => c.grammar));
const engines = new Set(plan.cues.flatMap(c => c.engine || []));
if (grammars.size < 2 && plan.cues.length >= 4) failures.push('全片只有一种动画语法');
if ([...grammars].every(x => /fade|slide|stagger/i.test(x))) failures.push('全片仅使用fade/slide/stagger');
if (!engines.has('gsap')) failures.push('缺少GSAP连续对象层');
const missingEvidence = plan.cues.filter(c => c.evidenceRequired && c.evidenceStatus === 'missing');
if (missingEvidence.length) failures.push(`数据cue缺少可匹配的product-facts.md来源字段: ${missingEvidence.map(c => c.cueId).join(', ')}`);
const unbound = plan.cues.filter(c => c.evidenceRequired && (!c.sourceFields || !c.sourceFields.length));
if (unbound.length) failures.push(`数据cue未绑定具体来源字段: ${unbound.map(c => c.cueId).join(', ')}`);
const autoBound = plan.cues.filter(c => c.evidenceStatus === 'bound-needs-human-check');
if (autoBound.length) warnings.push(`人工核对自动匹配的来源字段: ${autoBound.map(c => c.cueId).join(', ')}`);
const heroSections = new Set(plan.cues.filter(c => c.heroId === plan.hero?.id).map(c => c.section));
if (heroSections.size < Math.min(3, new Set(plan.cues.map(c => c.section)).size)) failures.push('连续Hero未覆盖至少3个章节');
for (const cue of plan.cues) {
  if (!cue.cueId || !cue.semanticType || !cue.grammar || !cue.fromState || !cue.toState) failures.push(`cue字段不完整: ${cue.cueId || '(unknown)'}`);
  if (cue.engine?.includes('motion-canvas') && !cue.rationale?.includes('复杂')) failures.push(`Motion Canvas缺少必要性说明: ${cue.cueId}`);
}
const status = failures.length ? '不通过' : '通过（实现前仍需人工语义复核）';
const report = `# Animation Preflight\n\n- 状态：**${status}**\n- 计划：\`${planPath}\`\n- cue数量：${plan.cues?.length || 0}\n- 动画语法：${[...grammars].join(', ') || '无'}\n- 引擎：${[...engines].join(', ') || '无'}\n- Hero跨章节：${heroSections.size}\n\n## 阻断项\n\n${failures.length ? failures.map(x => `- ${x}`).join('\n') : '- 无'}\n\n## 待人工复核\n\n${warnings.length ? warnings.map(x => `- ${x}`).join('\n') : '- 核对每个cue的语义、Hero状态和镜头必要性。'}\n`;
fs.writeFileSync(path.join(outDir, 'animation-preflight.md'), report);
console.log(report);
if (failures.length) process.exit(1);
