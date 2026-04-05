/**
 * 心芽·情绪植物气质测试
 * 60题，以植物特性为喻体，隐性表达4种气质
 * 计分：很符合+2, 比较符合+1, 一般0, 比较不符合-1, 很不符合-2
 */

export const TEMPERAMENT_TEST = {
  title: '心芽·情绪植物气质测试',
  desc: '每题均以植物特性为喻体，凭第一感觉作答',
  
  // 60题，按题目顺序排列
  questions: [
    // 1-15 粘液质
    {
      id: 1,
      text: '生长像银杏般稳妥，不慌不忙，从不会急于冒芽、急于开花。',
      type: 'slime'
    },
    {
      id: 2,
      text: '遇到不适宜的生长环境（如积水、强光），像火焰花般瞬间"绽放"，枝叶舒展、锋芒毕露。',
      type: 'bile'
    },
    {
      id: 3,
      text: '宁愿像苔藓般独自生长在角落，不愿和众多植物挤在一起，享受独处的生长环境。',
      type: 'depression'
    },
    {
      id: 4,
      text: '到一个新的生长环境（如换盆、换光照位置），像蒲公英的种子般快速适应。',
      type: 'blood'
    },
    {
      id: 5,
      text: '厌恶像火焰花般强烈的光照、像仙人掌般尖锐的枝干，偏爱温和、柔和的生长环境。',
      type: 'depression'
    },
    {
      id: 6,
      text: '与其他植物争夺光照时，像仙人掌般先发制人，主动向光照充足的地方延伸，不轻易退让。',
      type: 'bile'
    },
    {
      id: 7,
      text: '像罗汉松一样，偏爱安静的角落，不喜嘈杂的环境打扰生长。',
      type: 'slime'
    },
    {
      id: 8,
      text: '像紫藤般善于"攀附"同类，枝叶相互缠绕，乐于和其他植物共生，不喜欢孤立生长。',
      type: 'blood'
    },
    {
      id: 9,
      text: '羡慕像三角梅般能克制生长节奏，不盲目冒芽、不肆意开花的植物。',
      type: 'bile'
    },
    {
      id: 10,
      text: '作息像龟背竹，规律有序，叶片舒展的时间、吸收养分的节奏从不错乱。',
      type: 'slime'
    },
    {
      id: 11,
      text: '多数情况下，像月季般充满生机，叶片翠绿、花苞饱满，始终保持旺盛的生长状态。',
      type: 'blood'
    },
    {
      id: 12,
      text: '碰到陌生的植物或新的生长环境，像玉簪般枝叶蜷缩，难以快速舒展，适应缓慢。',
      type: 'depression'
    },
    {
      id: 13,
      text: '遇到强光或风雨，像玉露般能稳稳锁住水分，克制自己的生长节奏，不慌不乱。',
      type: 'slime'
    },
    {
      id: 14,
      text: '生长时像向日葵般精力旺盛，枝干挺拔，始终朝着光照的方向，充满力量。',
      type: 'bile'
    },
    {
      id: 15,
      text: '遇到生长难题（如叶片发黄、根系虚弱），像睡莲般生长停滞，难以快速调整光照或水分供给。',
      type: 'depression'
    },
    // 16-30
    {
      id: 16,
      text: '在一片植物中，像满天星般自在生长，从不觉得拘谨，枝叶舒展、毫无束缚。',
      type: 'blood'
    },
    {
      id: 17,
      text: '光照充足时，像火焰花般长势旺盛、充满生机；光照不足时，又像被抽走养分，枝叶萎靡。',
      type: 'bile'
    },
    {
      id: 18,
      text: '生长时像龟背竹般专注扎根，始终朝着固定的养分方向吸收，不易受周边环境干扰。',
      type: 'slime'
    },
    {
      id: 19,
      text: '符合自己喜好的生长环境（如温暖、湿润），就像月季般劲头十足，疯狂冒芽、开花；否则就萎靡不振。',
      type: 'blood'
    },
    {
      id: 20,
      text: '碰到恶劣的生长情景（如暴雨、强风），像兰花般枝叶发颤、花苞闭合，难以适应极端环境。',
      type: 'depression'
    },
    {
      id: 21,
      text: '对生长、开花，像向日葵般怀有极高的热情，一旦开始生长，就充满冲劲。',
      type: 'bile'
    },
    {
      id: 22,
      text: '能像多肉玉露一样，长时间在单调的环境中扎根，耐得住枯燥，慢慢积累养分。',
      type: 'slime'
    },
    {
      id: 23,
      text: '讨厌像多肉般需要耐心、细致照料的生长方式，偏爱像满天星般随意生长、快速开花。',
      type: 'blood'
    },
    {
      id: 24,
      text: '一点小事（如轻微缺水、光照偏移），就能像苔藓般出现生长波动，叶片发黄、长势放缓。',
      type: 'depression'
    },
    {
      id: 25,
      text: '生长时间长了，像蒲公英般容易感到厌倦，需要更换光照位置或养分类型，才能重新恢复活力。',
      type: 'blood'
    },
    {
      id: 26,
      text: '与人相处时，像银杏枝干般不卑不亢，扎根扎实，不刻意讨好也不疏离。',
      type: 'slime'
    },
    {
      id: 27,
      text: '喜欢像三角梅般生长在热烈的环境中，偏爱光照充足、充满活力的生长氛围。',
      type: 'bile'
    },
    {
      id: 28,
      text: '爱看像睡莲般叶片细腻、形态优雅，长势平缓的植物，不喜张扬奔放的品种。',
      type: 'depression'
    },
    {
      id: 29,
      text: '疲倦时，像月季般只要短暂补充水分和光照，就能快速恢复生机，重新投入生长。',
      type: 'blood'
    },
    {
      id: 30,
      text: '不喜长时间纠结于"如何生长"，更愿意像罗汉松一样，踏实扎根，稳步生长。',
      type: 'slime'
    },
    // 31-45
    {
      id: 31,
      text: '宁愿像火焰花般尽情绽放、肆意生长，也不愿像苔藓般默默生长、长势平缓。',
      type: 'bile'
    },
    {
      id: 32,
      text: '自身长势常显平缓，像玉簪般很少有枝叶舒展的旺盛时刻，始终保持温和的生长状态。',
      type: 'depression'
    },
    {
      id: 33,
      text: '适应新的生长环境（如光照、水分变化），像龟背竹般比其他植物慢一些，但一旦适应就会稳定生长。',
      type: 'slime'
    },
    {
      id: 34,
      text: '遇到不利于生长的环境（如短暂干旱、轻微病虫害），像满天星般能很快调整状态，继续生长。',
      type: 'blood'
    },
    {
      id: 35,
      text: '自身生长需求（如需要温和光照、少量水分），宁愿像兰花般默默调整，不主动向同类靠拢求助。',
      type: 'depression'
    },
    {
      id: 36,
      text: '认准开花的方向，就像向日葵认准太阳一样，全力生长，力求尽快绽放。',
      type: 'bile'
    },
    {
      id: 37,
      text: '同样的生长时间、同样的养分供给，像苔藓般比其他植物长势更缓，叶片更早失去光泽。',
      type: 'depression'
    },
    {
      id: 38,
      text: '喜欢像火焰花般生长在光照强烈、充满活力的环境，偏爱"热烈"的生长节奏。',
      type: 'bile'
    },
    {
      id: 39,
      text: '吸收新的养分（如肥料、光照）时，希望像玉露一样，慢一点、多重复几次，才能彻底吸收。',
      type: 'slime'
    },
    {
      id: 40,
      text: '进入开花、长新枝的生长阶段后，像紫藤般希望快速完成，不喜欢拖延生长节奏。',
      type: 'blood'
    },
    {
      id: 41,
      text: '进入长新叶、开花的生长阶段，像睡莲般比其他植物花的时间多，生长节奏缓慢。',
      type: 'depression'
    },
    {
      id: 42,
      text: '生长有些像仙人掌般莽撞，有时会不顾土壤湿度、光照强度，盲目冒芽、延伸枝干，不考虑后果。',
      type: 'bile'
    },
    {
      id: 43,
      text: '生长时像银杏，一旦扎根在某个生长区域，就会稳定扎根，不会轻易转移生长方向。',
      type: 'slime'
    },
    {
      id: 44,
      text: '希望像月季般生长在变化大、花样多的环境中，不喜一成不变的光照和养分供给。',
      type: 'blood'
    },
    {
      id: 45,
      text: '认为像罗汉松般墨守成规、稳步生长，比冒进生长、承担风险更稳妥。',
      type: 'slime'
    },
    // 46-60
    {
      id: 46,
      text: '反应像满天星般敏捷，一旦感受到光照、水分的变化，就能快速调整生长节奏。',
      type: 'blood'
    },
    {
      id: 47,
      text: '当生长环境变得烦闷（如空气不流通、光照不足），像兰花般长势难以恢复，始终保持萎靡状态。',
      type: 'depression'
    },
    {
      id: 48,
      text: '爱看像三角梅般花团锦簇、热烈奔放的植物，不喜叶片单薄、生长缓慢的品种。',
      type: 'bile'
    },
    {
      id: 49,
      text: '对待生长，像龟背竹一样认真严谨，叶片舒展、扎根深浅，始终保持一致的节奏。',
      type: 'slime'
    },
    {
      id: 50,
      text: '和周围的植物相处时，像仙人掌般带着锋芒，枝叶舒展时常常不经意间触碰同类。',
      type: 'bile'
    },
    {
      id: 51,
      text: '喜欢像玉簪般保持熟悉的生长节奏，重复适应的生长状态（如吸收固定位置的光照）。',
      type: 'depression'
    },
    {
      id: 52,
      text: '能像蒲公英般同时兼顾多个生长方向（如长新枝、冒花苞、延伸藤蔓），长势有序不慌乱。',
      type: 'blood'
    },
    {
      id: 53,
      text: '适应的生长技巧（如适合自己的水分量），像苔藓般能长期保持，不易改变。',
      type: 'depression'
    },
    {
      id: 54,
      text: '自身生长方式偏张扬（如枝干长得过急、花开得太艳），但始终保持自身的生长节奏，不刻意改变。',
      type: 'bile'
    },
    {
      id: 55,
      text: '在同类植物中，像玉露般适应新环境的速度不如其他植物快，生长节奏始终平缓。',
      type: 'slime'
    },
    {
      id: 56,
      text: '假如生长环境枯燥无味（如单一光照、单一养分），就像紫藤般马上枝叶萎靡，长势放缓。',
      type: 'blood'
    },
    {
      id: 57,
      text: '偏爱像银杏一样有条理、不麻烦的生长环境，不喜杂乱无章的养分供给。',
      type: 'slime'
    },
    {
      id: 58,
      text: '遇到充足的养分或强烈的光照，像向日葵般长势迅猛，甚至会"过度生长"，影响夜间的代谢节奏。',
      type: 'bile'
    },
    {
      id: 59,
      text: '接触新的生长方法时，像睡莲般初期难以适应，但一旦掌握，就会长期保持该生长模式，不易改变。',
      type: 'depression'
    },
    {
      id: 60,
      text: '在所有植物中，像满天星般反应最快，一旦感受到环境变化，就能立即调整状态。',
      type: 'blood'
    }
  ],
  
  // 选项
  options: [
    { value: 2, label: '很符合' },
    { value: 1, label: '比较符合' },
    { value: 0, label: '一般/不确定' },
    { value: -1, label: '比较不符合' },
    { value: -2, label: '很不符合' }
  ],
  
  // 气质类型映射
  types: {
    bile: { name: '胆汁质', plants: ['向日葵', '仙人掌', '三角梅', '火焰花'] },
    blood: { name: '多血质', plants: ['紫藤', '蒲公英', '月季', '满天��'] },
    slime: { name: '粘液质', plants: ['银杏', '罗汉松', '玉露', '龟背竹'] },
    depression: { name: '抑郁质', plants: ['睡莲', '兰花', '苔藓', '玉簪'] }
  }
};

// 计算结果：支持部分答题，根据完成度计算基础分+随机加成
export function calculateResult(answers: number[]) {
  const scores = { bile: 0, blood: 0, slime: 0, depression: 0 };
  
  // 统计答题数量
  let answeredCount = 0;
  TEMPERAMENT_TEST.questions.forEach((q, i) => {
    if (answers[i] !== undefined) {
      scores[q.type as keyof typeof scores] += answers[i];
      answeredCount++;
    }
  });
  
  // 计算完成度百分比
  const completionRate = answeredCount / TEMPERAMENT_TEST.questions.length;
  
  // 基础分 = 120 × 完成度百分比
  const baseScore = Math.round(120 * completionRate);
  
  // 加成：只有完成100%测试的用户才能获得随机加成
  let bonusPercent = 0;
  if (completionRate >= 1) {
    // 完成100%测试的用户，按比例分配加成
    const rand = Math.random() * 100;
    if (rand < 60) {
      // 60%用户 → +10%
      bonusPercent = 10;
    } else if (rand < 85) { // 60% + 25%
      // 25%用户 → +13%
      bonusPercent = 13;
    } else if (rand < 95) { // 85% + 10%
      // 10%用户 → +17%
      bonusPercent = 17;
    } else if (rand < 99) { // 95% + 4%
      // 4%用户 → +23%
      bonusPercent = 23;
    } else {
      // 1%用户 → +30% 超级稀有
      bonusPercent = 30;
    }
  }
  
  // 最终总分 = 基础分 + (120 × 随机加成%)
  const finalScore = baseScore + Math.round(120 * (bonusPercent / 100));
  
  // 将最终分数按比例分配到各气质维度（保持原有比例）
  const totalCurrentScore = Object.values(scores).reduce((a, b) => a + Math.abs(b), 0) || 1;
  Object.keys(scores).forEach(key => {
    const proportion = Math.abs(scores[key as keyof typeof scores]) / totalCurrentScore;
    scores[key as keyof typeof scores] = Math.round(finalScore * proportion);
  });
  
  // 排序确定主类型
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [primary, primaryScore] = sorted[0];
  const [secondary, secondaryScore] = sorted[1];
  
  // 判断结果类型
  let resultType: string;
  const diff = primaryScore - secondaryScore;
  
  if (diff >= 20 && primaryScore > 60) {
    resultType = `典型${TEMPERAMENT_TEST.types[primary as keyof typeof TEMPERAMENT_TEST.types].name}`;
  } else if (diff >= 10 && primaryScore >= 30) {
    resultType = `一般${TEMPERAMENT_TEST.types[primary as keyof typeof TEMPERAMENT_TEST.types].name}`;
  } else if (diff <= 5 && diff >= -5 && primaryScore >= 30) {
    resultType = `混合型`;
  } else {
    resultType = TEMPERAMENT_TEST.types[primary as keyof typeof TEMPERAMENT_TEST.types].name;
  }
  
  // 附加稀有度标记
  let rarityLabel = '';
  if (completionRate >= 1) {
    // 100%完成，根据加成显示稀有度
    if (bonusPercent === 30) {
      rarityLabel = '（超级稀有）';
    } else if (bonusPercent === 23) {
      rarityLabel = '（珍稀）';
    } else if (bonusPercent === 17) {
      rarityLabel = '（稀有）';
    } else if (bonusPercent === 13) {
      rarityLabel = '（少见）';
    } else {
      rarityLabel = '（标准）';
    }
  } else if (completionRate >= 0.6) {
    rarityLabel = '（未完成）';
  } else if (completionRate >= 0.25) {
    rarityLabel = '（精简版）';
  } else if (completionRate >= 0.1) {
    rarityLabel = '（速测版）';
  } else if (completionRate >= 0.04) {
    rarityLabel = '（微测版）';
  } else {
    rarityLabel = '（超级稀有）';
  }
  
  return {
    scores,
    primaryType: primary,
    secondaryType: secondary,
    resultType: resultType + rarityLabel,
    plant: TEMPERAMENT_TEST.types[primary as keyof typeof TEMPERAMENT_TEST.types].plants[0],
    completionRate: Math.round(completionRate * 100),
    bonusPercent, // 加成百分比（只有100%完成才有）
    baseScore, // 基础分
    finalScore // 最终总分
  };
}