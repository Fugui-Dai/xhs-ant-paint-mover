/* 18大主题章节 · 360关多元异形+算法图腾像素画库 + 无尽模式 + 全机关必可解打包器（ES2017） */
(function (global) {
  'use strict';

  var PALETTE = {
    'B': { name: '晴空蓝', hex: '#6fc3df', dark: '#4898b4', ant: '#56b2d1' },
    'W': { name: '奶霜白', hex: '#fff8ea', dark: '#d6c8ab', ant: '#ebe1cc' },
    'Y': { name: '蛋黄金', hex: '#f8cb46', dark: '#ca9818', ant: '#ecb92a' },
    'O': { name: '焦糖橙', hex: '#f08334', dark: '#bd5712', ant: '#e47221' },
    'K': { name: '可可棕', hex: '#5b4234', dark: '#362318', ant: '#6d5040' },
    'R': { name: '草莓红', hex: '#eb5858', dark: '#b83131', ant: '#dc4545' },
    'P': { name: '樱花粉', hex: '#f490b3', dark: '#c45e83', ant: '#e6769d' },
    'G': { name: '嫩叶绿', hex: '#67be62', dark: '#408e3d', ant: '#55ac51' },
    'D': { name: '森林绿', hex: '#33814e', dark: '#1d5731', ant: '#2c7144' },
    'V': { name: '葡萄紫', hex: '#997ad0', dark: '#694aa1', ant: '#8565bd' },
    'N': { name: '深海蓝', hex: '#3a609e', dark: '#213c6b', ant: '#30528a' },
    'T': { name: '浅卡其', hex: '#dab57f', dark: '#ab844f', ant: '#c79f68' }
  };

  var CHAPTERS = [
    { id: 1, name: '街头小吃街', desc: '美味剪影 · 轻松上手', badge: '1-20关' },
    { id: 2, name: '甜品烘焙屋', desc: '冰霜初遇 · 甜点造型', badge: '21-40关' },
    { id: 3, name: '萌宠动物园', desc: '冰霜厚涂 · 可爱生灵', badge: '41-60关' },
    { id: 4, name: '深海奇遇记', desc: '泥块封印 · 海洋生物', badge: '61-80关' },
    { id: 5, name: '森林植物园', desc: '泥块封印 · 花草果实', badge: '81-100关' },
    { id: 6, name: '钥匙秘宝库', desc: '金钥匙开锁 · 宝藏武器', badge: '101-120关' },
    { id: 7, name: '国风百景图', desc: '礼物包装纸 · 民俗雅物', badge: '121-140关' },
    { id: 8, name: '交通大冒险', desc: '海陆空载具 · 剪影挑战', badge: '141-160关' },
    { id: 9, name: '万花对称阵', desc: '玫瑰曲线 · 对称图腾', badge: '161-180关' },
    { id: 10, name: '潮流音乐铺', desc: '盲盒小队 · 乐器数码', badge: '181-200关' },
    { id: 11, name: '魔法学院', desc: '钥匙与礼盒 · 奇幻道具', badge: '201-220关' },
    { id: 12, name: '昆虫微观园', desc: '爆破工蚁 · 林间小虫', badge: '221-240关' },
    { id: 13, name: '像素怪兽工坊', desc: '独创镜像萌怪 · 绝不重样', badge: '241-260关' },
    { id: 14, name: '四季与天气', desc: '日月中雨雪 · 气象图鉴', badge: '261-280关' },
    { id: 15, name: '几何建筑师', desc: '宝塔金字塔 · 螺旋迷阵', badge: '281-300关' },
    { id: 16, name: '万圣奇幻夜', desc: '星夜主题 · 幽灵南瓜夜', badge: '301-320关' },
    { id: 17, name: '星际漫游', desc: '14x14 大画幅 · 宇宙奇观', badge: '321-340关' },
    { id: 18, name: '蚁后皇家殿堂', desc: '全机关融合 · 终极殿堂', badge: '341-360关' }
  ];

  /* 95+ 独立异形轮廓像素模板 */
  var SHAPES = {
    miniegg: ['............', '....WWWW....', '...WWWWWW...', '..WWYYYYWW..', '..WWYYYYWW..', '..WWYYYYWW..', '..WWWWWWWW..', '...WWWWWW...', '....TTTT....', '............', '............', '............'],
    miniheart: ['............', '..RRR..RRR..', '.RRPRRRRPRR.', '.RPWRRRRPRR.', '..RRRRRRRR..', '...RRRRRR...', '....PPPP....', '.....PP.....', '............', '............', '............', '............'],
    egg: ['....KKKK....', '..KKWWWWKK..', '.KWWWWWWWWK.', 'KWWWYYYYWWWK', 'KWWYYYYYYWWK', 'KWWYYYYOOWWK', 'KWWYYYYOOWWK', '.KWWYYYYWWK.', '.KWWWWWWWWK.', '..KKWWWWKK..', '....KKKK....', '............'],
    heart: ['.RRR....RRR.', 'RRRRR..RRRRR', 'RWWWRRRRRRRR', 'RWWRRRRRRRRR', 'RRRRRRRRRRRR', '.RRRRRRRRRR.', '..RRRRRRRR..', '...RRRRRR...', '....RRRR....', '.....RR.....', '............', '............'],
    strawberry: ['....GGGG....', '..GGGGGGGG..', '..RRRRRRRR..', '.RRYRRRRRYR.', '.RRRRRRRRRR.', '.RYRRRRRRYR.', '..RRRRRRRR..', '..RRYRRRYR..', '...RRRRRR...', '....RRRR....', '.....RR.....', '............'],
    icecream: ['....PPPP....', '...PPPPPP...', '..PPPPPPPP..', '..PPWPPWPP..', '..PPPPPPPP..', '...TTTTTT...', '...TKTKTK...', '....TTTT....', '....TKTK....', '.....TT.....', '.....TT.....', '............'],
    burger: ['...TTTTTT...', '..TTWTTWTT..', '.TTTTTTTTTT.', '.GGGGGGGGGG.', '.YYYYYYYYYY.', '.KKKKKKKKKK.', '..RRRRRRRR..', '..TTTTTTTT..', '...TTTTTT...', '............', '............', '............'],
    donut: ['...PPPPPP...', '..PPYPPWPP..', '.PPPWPPPYPP.', '.PPPKKKKPPP.', 'TTTPK..KPTTT', 'TTTPKKKKPTTT', 'TTTTTTTTTTTT', '.TTTTTTTTTT.', '..TTTTTTTT..', '...TTTTTT...', '............', '............'],
    watermelon: ['.....RR.....', '....RRRR....', '...RKRRKR...', '..RRRRRRRR..', '.RRKRRRRKRR.', '.RRRRRRRRRR.', 'WWWWWWWWWWWW', 'GGGGGGGGGGGG', '.DDDDDDDDDD.', '..DDDDDDDD..', '............', '............'],
    pineapple: ['....G..G....', '...GGGGG....', '..GGGGGGGG..', '...YYYYYY...', '..YYOYYOYY..', '..YYYYYYYY..', '..YOOYYOOY..', '..YYYYYYYY..', '..YYOYYOYY..', '...YYYYYY...', '....YYYY....', '............'],
    cherry: ['.....GGG....', '....G..GG...', '...G....G...', '..G......G..', '.RRR....RRR.', 'RWWRR..RWWRR', 'RRRRR..RRRRR', 'RRRRR..RRRRR', '.RRR....RRR.', '............', '............', '............'],
    avocado: ['....GGGG....', '...GGGGGG...', '...GYYYYG...', '..GGYYYYGG..', '..GYKKKKYG..', '..GYKKKKYG..', '..GGYYYYGG..', '..GGGGGGGG..', '...GGGGGG...', '....GGGG....', '............', '............'],
    carrot: ['........GG..', '.......GGGG.', '......GG.G..', '.....OOOO...', '....OOOOO...', '...OOKOO....', '..OOOOO.....', '.OOKOO......', '.OOOO.......', 'OO..........', '............', '............'],
    boba: ['....KK......', '....K.......', '..WWWWWWWW..', '..WWWWWWWW..', '...TTTTTT...', '...TTTTTT...', '...TTTTTT...', '...KKTTKK...', '...KKKKKK...', '....KKKK....', '............', '............'],
    sushi: ['..OOOOOOOO..', '.OOWOOOWOOO.', '.OOOOOOOOOO.', '.WWWWWWWWWW.', '.WWWWWWWWWW.', '.WWKKKKKKWW.', '..WKKKKKKW..', '...KKKKKK...', '............', '............', '............', '............'],
    croissant: ['....YYYY....', '..YYOOOOYY..', '.YYOOKKOOYY.', 'YYOOKKKKOOYY', 'YOOK....KOOY', 'YYO......OYY', '.YY......YY.', '............', '............', '............', '............', '............'],
    ramen: ['..W..W..W...', '...W..W..W..', '..YYYYYYYY..', '.YYWYYYYOYY.', '.YYWWWWWOYY.', '.RRRRRRRRRR.', '..RRRRRRRR..', '..RRRRRRRR..', '...KKKKKK...', '............', '............', '............'],
    pizza: ['..KKKKKKKK..', '..KYYYYYYK..', '...YRRYYRY..', '...YYYYYYY..', '....YYRYY...', '....YYYYY...', '.....YRY....', '.....YYY....', '......Y.....', '......Y.....', '............', '............'],
    fries: ['..YY.YY.YY..', '.YYYYYYYYYY.', '.YY.YYYY.YY.', '..RRRRRRRR..', '..RRRRRRRR..', '..RRYYYYRR..', '..RRRRRRRR..', '...RRRRRR...', '...RRRRRR...', '............', '............', '............'],
    hotdog: ['...TTTTTT...', '..TTTTTTTT..', '.TKKKKKKKKT.', 'TKKOOKKOOKKT', '.TTTTTTTTTT.', '..TTTTTTTT..', '...TTTTTT...', '............', '............', '............', '............', '............'],
    cupcake: ['.....RR.....', '....PPPP....', '...PPPPPP...', '..PPWPPWPP..', '..PPPPPPPP..', '..KKKKKKKK..', '...KKTTKK...', '...KKTTKK...', '....KKKK....', '............', '............', '............'],
    lollipop: ['...RRRRRR...', '..RRWWWWWR..', '.RRWWRRWRRR.', '.RRWRWWRWRR.', '.RRWWRRWRRR.', '..RRWWWWWR..', '...RRRRRR...', '.....WW.....', '.....WW.....', '.....WW.....', '.....WW.....', '............'],
    cheese: ['....YYYY....', '..YYYYYYYY..', '.YYYOOYYYYY.', 'YYYYOOYYYYYY', 'YYYYYYYYYYYY', 'YYOOYYYYOYYY', 'YYOOYYYYOYYY', 'YYYYYYYYYYYY', '............', '............', '............', '............'],
    honeyjar: ['...KKKKKK...', '....TTTT....', '..OOOOOOOO..', '.OOYYYYYYOO.', '.OOYWWWWYOO.', '.OOYYYYYYOO.', '.OOOOOOOOOO.', '..OOOOOOOO..', '...OOOOOO...', '............', '............', '............'],
    dumpling: ['....WWWW....', '..WWWWWWWW..', '.WWTTTTTTWW.', 'WWWWWWWWWWWW', 'WWWWWWWWWWWW', '.WWWWWWWWWW.', '..WWWWWWWW..', '............', '............', '............', '............', '............'],
    onigiri: ['.....WW.....', '....WWWW....', '...WWWWWW...', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WWWKKKKWWW.', 'WWWWKKKKWWWW', 'WWWWKKKKWWWW', '.WWWWWWWWWW.', '............', '............', '............'],
    popcorn: ['...WW..WW...', '..WWWWWWWW..', '.WWYWWWWYWW.', '..WWWWWWWW..', '..RRWWRRWW..', '..RRWWRRWW..', '...RRWWRR...', '...RRWWRR...', '...RRWWRR...', '............', '............', '............'],
    butterfly: ['.OOO....OOO.', 'OOYYO..OYYOO', 'OYKOO..OOKYO', 'OOOOOKKOOOOO', '.OOOKKKKOOO.', '..PPPKKPPP..', '.PPWPKKPWPP.', '.PPPPKKPPPP.', '..PP....PP..', '............', '............', '............'],
    frog: ['..GG....GG..', '.GWGK..KWGG.', '.GGGGGGGGGG.', 'GGGGGGGGGGGG', 'GGKGGGGGGKGG', 'GGGKKKKKKGGG', '.GGGGGGGGGG.', '.GGWWWWWWGG.', '.GGWWWWWWGG.', '..GG....GG..', '............', '............'],
    whale: ['....W..W....', '...W....W...', '.....B......', '...BBBBBB...', '..BBBBBBBB..', '.BBKBBBBBBB.', 'BBBBBBBBBBBB', 'WWWWWWWWWWWB', '.WWWWWWWWWW.', '..BBBBBBBB..', '............', '............'],
    octopus: ['....PPPP....', '..PPPPPPPP..', '.PPPPPPPPPP.', '.PPKPPPPKPP.', '.PPPPPPPPPP.', '..PPPPPPPP..', '.PP.PP.PP.PP', 'PP..PP.PP..P', 'P...P...P..P', '............', '............', '............'],
    owl: ['..KK....KK..', '.KKKKKKKKKK.', '.KKWWKKWWKK.', '.KKWKYYKWKK.', '.KKKKKKKKKK.', '.KKTTTTTTKK.', '.KKTKTKTKKK.', '..KTTTTTTK..', '..KKKKKKKK..', '...YY..YY...', '............', '............'],
    dino: ['.....GGGG...', '....GGGGGG..', '....GGKGGG..', '....GGGGGG..', '..D.GGGG....', '.DGGGGGG....', 'DGGGGGGGG...', '.GGGGGGGG...', '..GGG..GG...', '..GGG..GG...', '............', '............'],
    cat: ['.OO......OO.', '.OYO....OYO.', '.OOOOOOOOOO.', 'OOOOOOOOOOOO', 'OOKOOOOOOKOO', 'OOOOPPPPOOOO', '.OOWWWWWWO..', '..OOOOOOOO..', '..OO....OO..', '............', '............', '............'],
    bunny: ['..WW....WW..', '..WP....PW..', '..WP....PW..', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WWKWWWWKWW.', '.WPWWWWWWPW.', '..WWPPPPWW..', '..WWWWWWWW..', '...WWWWWW...', '............', '............'],
    duck: ['....YYYY....', '...YYYYYY...', '..YYKYYYYY..', '..YYYYOOOOO.', '..YYYYYYYY..', '...YYYYYY...', '.YYYYYYYYYY.', '.YYYOYYYYYY.', '..YYYYYYYY..', '....OOOO....', '............', '............'],
    penguin: ['....KKKK....', '...KKKKKK...', '..KKWKKWKK..', '..KKKYYKKK..', '..KKKKKKKK..', '.KKWWWWWWKK.', '.KKWWWWWWKK.', '.KKWWWWWWKK.', '..KKKKKKKK..', '...OO..OO...', '............', '............'],
    bee: ['...WW..WW...', '..WWWWWWWW..', '...YYYYYY...', '..KKKKKKKK..', '.YYKYYYYKYY.', '.YYYYYYYYYY.', '..KKKKKKKK..', '..YYYYYYYY..', '...KKKKKK...', '....KKKK....', '.....K......', '............'],
    ladybug: ['.....KK.....', '...KKKKKK...', '..RRRRRRRR..', '.RRKRRRRKRR.', '.RRRRKKRRRR.', '.RRKRRRRKRR.', '.RRRRKKRRRR.', '..RRRRRRRR..', '...RRRRRR...', '............', '............', '............'],
    fish: ['.....OOO....', '...OOOOOO...', '.OOWOOOOOOO.', 'OOOKOOOOO.OO', 'OOOOOOOOOOOO', 'OOOOOOOOO.OO', '.OOOOOOOOOO.', '...OOOOOO...', '.....OOO....', '............', '............', '............'],
    crab: ['.R........R.', 'RR..RRRR..RR', '.R.RRRRRR.R.', '..RRRRRRRR..', '..RKRRRRKR..', '..RRRRRRRR..', '.R.RRRRRR.R.', 'R..R....R..R', '............', '............', '............', '............'],
    turtle: ['....GGGG....', '...GGKKGG...', '..GDDDDDDG..', '.GGDDDDDDGG.', 'GGDDDDDDDDGG', '.GGGGGGGGGG.', '..GG....GG..', '..GG....GG..', '............', '............', '............', '............'],
    snail: ['....OOOO....', '..OOYYYYOO..', '.OOYOOOYYOO.', '.OOYOYOOYOO.', '.GGYYYYYYOO.', 'GGG.GGGGGG..', 'GGGGGGGGGGGG', '.GGGGGGGGGG.', '............', '............', '............', '............'],
    bear: ['.KK......KK.', '.KTK....KTK.', '..KKKKKKKK..', '.KKKKKKKKKK.', '.KKKTTTTKKK.', '.KKKPKKPKKK.', '..KKKKKKKK..', '..KKTTTTKK..', '...KKKKKK...', '............', '............', '............'],
    piggy: ['.PP......PP.', '..PPPPPPPP..', '.PPKPPPPKPP.', '.PPPPPPPPPP.', '.PPPRRRRPPP.', '.PPRKRRKRPP.', '.PPPRRRRPPP.', '..PPPPPPPP..', '...PPPPPP...', '............', '............', '............'],
    chick: ['....YYYY....', '...YYYYYY...', '..YYKYYYYY..', '..YYYYYYOO..', '..YYYYYYYY..', '.YYYYYYYYYY.', '.YYYOYYYYYY.', '..YYYYYYYY..', '...O....O...', '............', '............', '............'],
    fox: ['.O........O.', 'OO........OO', 'OOO......OOO', 'OOOOOOOOOOOO', 'OOKOOOOOOKOO', '.OWWWKKWWWO.', '..WWWWWWWW..', '...OOOOOO...', '....KKKK....', '............', '............', '............'],
    koala: ['.WW......WW.', 'WTTW....WTTW', '.TTTTTTTTTT.', '.TTKTTTTKTT.', '.TTTTKKTTTT.', '.TTTTKKTTTT.', '..TTTTTTTT..', '...TTTTTT...', '............', '............', '............', '............'],
    pinetree: ['.....GG.....', '....GGGG....', '...GGGGGG...', '....GGGG....', '...GGDDGG...', '..GGGGGGGG..', '...DDDDDD...', '..GGGGGGGG..', '.GGDDDDDDGG.', '....KKKK....', '....KKKK....', '............'],
    cactus: ['.....RR.....', '....GGGG....', '.GG.GGGG.GG.', '.GG.GDDG.GG.', '.GGGGGGGGGG.', '..GGGGGGGG..', '....GGGG....', '..OOOOOOOO..', '..TTTTTTTT..', '...TTTTTT...', '............', '............'],
    mushroom: ['...RRRRRR...', '.RRWRRRWRRR.', 'RRRRRRRRRRRR', 'RWRRRRRRRRWR', 'RRRRRRRRRRRR', '...WWWWWW...', '....WWWW....', '....WWWW....', '..GGWWWWGG..', '..GGGGGGGG..', '............', '............'],
    sunflower: ['...YYYYYY...', '..YYYYYYYY..', '.YYKKKKKKYY.', '.YYKOOOOKYY.', '.YYKKKKKKYY.', '..YYYYYYYY..', '...YYYYYY...', '.....DD.....', '..GGGDGGGG..', '.....DD.....', '.....DD.....', '............'],
    clover: ['..GGG..GGG..', '.GGGGGGGGGG.', '.GGDDGGDDGG.', '..GGGGGGGG..', '....DDDD....', '..GGGGGGGG..', '.GGDDGGDDGG.', '.GGGGGGGGGG.', '..GGG..GGG..', '.....DD.....', '.....DD.....', '............'],
    maple: ['.....RR.....', '....RRRR....', '.R..RRRR..R.', 'RRRRRRRRRRRR', '.RRROOOORRR.', '..RROOOORR..', '.RRRRRRRRRR.', '..RR.RR.RR..', '.....RR.....', '.....RR.....', '............', '............'],
    tulip: ['.P..PP..P...', '.PPPPPPPP...', '.PPRRRRPP...', '..PPPPPP....', '...PPPP.....', '....GG......', '..GGGGGG....', '....GG......', '..OOOOOO....', '...TTTT.....', '............', '............'],
    apple: ['.....KG.....', '.....KGGG...', '..RRRRRRRR..', '.RRWWRRRRRR.', 'RRWWRRRRRRRR', 'RRRRRRRRRRRR', 'RRRRRRRRRRRR', '.RRRRRRRRRR.', '..RRRRRRRR..', '...RRRRRR...', '............', '............'],
    sakura: ['..PPPPPPPP..', '.PPWWWWWWPP.', 'PPPWPPPPWPPP', 'PPPPPPPPPPPP', '.PPPKKKKPPP.', '....KKKK....', '....KKKK....', '..GGKKKKGG..', '.GGGGGGGGGG.', '............', '............', '............'],
    palmtree: ['..GGGG.GGGG.', '.GG.GGGG.GG.', 'G....GG....G', '.....TT.....', '.....TT.....', '......TT....', '......TT....', '.....TTT....', '....YYYYY...', '............', '............', '............'],
    star: ['.....YY.....', '.....YY.....', '....YYYY....', 'YYYYYYYYYYYY', '.YYYYYYYYYY.', '..YYYYYYYY..', '..YYYYYYYY..', '.YYYY..YYYY.', '.YY......YY.', '............', '............', '............'],
    moon: ['....YYYY....', '..YYYYYY....', '.YYYYY......', 'YYYYY.......', 'YYYY........', 'YYYY........', 'YYYYY.......', '.YYYYY......', '..YYYYYY....', '....YYYY....', '............', '............'],
    sun: ['..Y..YY..Y..', '...Y.YY.Y...', '..YYYYYYYY..', 'YY.YOOOOY.YY', '..YOOOOOOY..', '..YOOOOOOY..', 'YY.YOOOOY.YY', '..YYYYYYYY..', '...Y.YY.Y...', '..Y..YY..Y..', '............', '............'],
    cloud: ['....WWWW....', '..WWWWWWWW..', '.WWWWWWWWWW.', 'WWWWWWWWWWWW', 'WWWWWWWWWWWW', '.WWWWWWWWWW.', '...B....B...', '..B....B....', '............', '............', '............', '............'],
    lightning: ['......YYYY..', '.....YYYY...', '....YYYY....', '...YYYYYY...', '..YYYYYY....', '....YYYY....', '...YYYY.....', '..YYY.......', '.YY.........', '............', '............', '............'],
    diamond: ['...BBBBBB...', '..BBWWWWBB..', '.BBBBBBBBBB.', 'BBBBWWWWBBBB', '.BBBBBBBBBB.', '..BBBBBBBB..', '...BBBBBB...', '....BBBB....', '.....BB.....', '............', '............', '............'],
    crown: ['.Y...YY...Y.', '.Y...YY...Y.', '.YY..YY..YY.', '.YYYYYYYYYY.', '.YYRYYYYVYY.', '.YYYYYYYYYY.', '.YYOOOOOOYY.', '.KKKKKKKKKK.', '.KKKKKKKKKK.', '............', '............', '............'],
    sword: ['.........WW.', '........WWW.', '.......WWBW.', '......WWBW..', '.....WWBW...', '.YY.WWBW....', '..YYYYW.....', '..KYYY......', '.KK..YY.....', 'KK..........', '............', '............'],
    shield: ['.KKKKKKKKKK.', 'KBBBBBBBBBBK', 'KBWWWWWWWWBK', 'KBWWYYYYWWBK', 'KBWWYYYYWWBK', 'KBBBBBBBBBBK', '.KBBBBBBBBK.', '..KBBBBBBK..', '...KBBBBK...', '....KKKK....', '............', '............'],
    potion: ['....TTTT....', '.....TT.....', '....WWWW....', '...WWWWWW...', '..WWPPPPWW..', '.WPPPPPPPPW.', '.WPPWPPPPPW.', '.WPPPPPPPPW.', '..WWWWWWWW..', '...WWWWWW...', '............', '............'],
    key: ['..YYYYYY....', '.YY....YY...', '.YY....YY...', '..YYYYYY....', '....YY......', '....YYYY....', '....YY......', '....YYYYY...', '....YY......', '............', '............', '............'],
    chest: ['..TTTTTTTT..', '.TYYYYYYYYT.', 'KKKKKKKKKKKK', 'KYYYYYYYYYYK', 'KKKYYWWYYKKK', 'KKKKKYYKKKKK', 'TTTTTTTTTTTT', 'KKKKKKKKKKKK', '............', '............', '............', '............'],
    trophy: ['.YYYYYYYYYY.', 'YY.YYYYYY.YY', 'YY.YYYYYY.YY', '.YYYYYYYYYY.', '..YYYYYYYY..', '....YYYY....', '....YYYY....', '...KKKKKK...', '..KKKKKKKK..', '............', '............', '............'],
    hourglass: ['.KKKKKKKKKK.', '..WWWWWWWW..', '..WWYYYYWW..', '...WWYYWW...', '....WWWW....', '....WWWW....', '...WWYYWW...', '..WWYYYYWW..', '..YYYYYYYY..', '.KKKKKKKKKK.', '............', '............'],
    wizardhat: ['......VV....', '.....VVVV...', '....VVVVVV..', '....VVYVVV..', '...VVVVVVVV.', '...YYYYYYYY.', '..VVVVVVVVVV', '.VVVVVVVVVVV', '............', '............', '............', '............'],
    wand: ['........YY..', '.......YYYY.', '......YYWYY.', '.......YYYY.', '......KK.YY.', '.....KK.....', '....KK......', '...KK.......', '..KK........', '.KK.........', '............', '............'],
    crystal: ['.....BB.....', '....BBBB....', '...BBWWBB...', '..BBWWWWBB..', '..BBBBBBBB..', '..BBBBBBBB..', '...BBBBBB...', '....BBBB....', '.....BB.....', '............', '............', '............'],
    lantern: ['.....Y......', '...YYYYYY...', '..RRRRRRRR..', '.RROOYYOORR.', 'RRROOYYOORRR', 'RRROOYYOORRR', '.RROOYYOORR.', '..RRRRRRRR..', '...YYYYYY...', '....OOOO....', '.....YY.....', '............'],
    fan: ['....RRRR....', '..RRYYYYRR..', '.RYYWWWWYYR.', 'RYWWPPPPWWYR', 'RYWPPPPPPWYR', '.RYWWPPWWYR.', '..KKKKKKKK..', '....KKKK....', '.....KK.....', '............', '............', '............'],
    teapot: ['.....KK.....', '...BBBBBB...', '.B.BBBBBB...', 'BB.BBWWBB.BB', '.B.BBBBBBBBB', '...BBBBBBBB.', '...BBBBBBBB.', '....BBBBBB..', '............', '............', '............', '............'],
    umbrella: ['.....KK.....', '...PPPPPP...', '..PPPPPPPP..', '.PPPPPPPPPP.', 'PPPPPPPPPPPP', '.....KK.....', '.....KK.....', '.....KK.....', '.....KK..KK.', '......KKKK..', '............', '............'],
    pagoda: ['.....YY.....', '....RRRR....', '..RRRRRRRR..', '...WWWWWW...', '..RRRRRRRR..', '.RRRRRRRRRR.', '...WWWWWW...', '.RRRRRRRRRR.', 'RRRRRRRRRRRR', '..KKKKKKKK..', '............', '............'],
    camera: ['...KKKK.....', '.KKKKKKKKKK.', 'KKRRKKKKKKKK', 'KKKWWWWWWKKK', 'KKWNNNNNNWKK', 'KKWNBWWBNWKK', 'KKWNNNNNNWKK', 'KKKWWWWWWKKK', 'TTTTTTTTTTTT', 'KKKKKKKKKKKK', '............', '............'],
    gameboy: ['..WWWWWWWW..', '..WKKKKKKW..', '..WKGGGGKW..', '..WKGGGGKW..', '..WKKKKKKW..', '..WWWWWWWW..', '..WKKWWRRW..', '..WKKWWPPW..', '..WWWWWWWW..', '..TTTTTTTT..', '............', '............'],
    headphones: ['...KKKKKK...', '..KK....KK..', '.KK......KK.', '.K........K.', 'RR........RR', 'RRR......RRR', 'RRR......RRR', 'RR........RR', '............', '............', '............', '............'],
    guitar: ['........KK..', '.......KK...', '......KK....', '.....KK.....', '...OOOO.....', '..OOOKOO....', '.OOOOKOOO...', '.OOOOOOOO...', '..OOOOOO....', '...OOOO.....', '............', '............'],
    musicnote: ['.....KKKKKK.', '.....KKKKKK.', '.....KK..KK.', '.....KK..KK.', '.....KK..KK.', '..KKKKK..KK.', '.KKKKKK.KKK.', '.KKKKKK.KKK.', '..KKKK..KK..', '............', '............', '............'],
    lightbulb: ['...YYYYYY...', '..YYWWWWYY..', '.YYYYYYYYYY.', '.YYYYYYYYYY.', '..YYYYYYYY..', '...YYYYYY...', '....TTTT....', '....TTTT....', '.....KK.....', '............', '............', '............'],
    book: ['.RRRRRRRRRR.', 'RRWWWWWWWWRR', 'RRWKKKKKKWRR', 'RRWKKKKKKWRR', 'RRWWWWWWWWRR', 'RRWKKKKKKWRR', 'RRWWWWWWWWRR', '.RRRRRRRRRR.', '............', '............', '............', '............'],
    car: ['...RRRRRR...', '..RWWWWWW...', '.RRRRRRRRRR.', 'RRRRRRRRRRRR', 'RRKKRRRRKKRR', '.KKKK..KKKK.', '..KK....KK..', '............', '............', '............', '............', '............'],
    train: ['..WW........', '...WW.......', '..KKKKKKKK..', '..KBBKKKKK..', '.KKKKKKKKKK.', 'RRRRRRRRRRRR', 'RRKKRRRRKKRR', '.KKKK..KKKK.', '............', '............', '............', '............'],
    plane: ['.....BB.....', '.....BB.....', '...BBBBBB...', '.BBBBBBBBBB.', 'BBBBBBBBBBBB', '.....BB.....', '....BBBB....', '...BB..BB...', '............', '............', '............', '............'],
    anchor: ['.....KK.....', '....K..K....', '.....KK.....', '..KKKKKKKK..', '.....KK.....', '.K...KK...K.', 'KK...KK...KK', '.KKKKKKKKKK.', '..KKKKKKKK..', '............', '............', '............'],
    rocket: ['.....RR.....', '....RRRR....', '...WWWWWW...', '...WWNNWW...', '...WWWWWW...', '..RRWWWWRR..', '.RRRWWWWRRR.', '....YYYY....', '...YYOOYY...', '....OOOO....', '............', '............'],
    ufo: ['....BBBB....', '...BWWWWB...', '..BBBBBBBB..', '.VVVVVVVVVV.', 'VVYVVYYVVYVV', '.VVVVVVVVVV.', '...YYYYYY...', '..YY....YY..', '.Y........Y.', '............', '............', '............'],
    saturn: ['....VVVV....', '..VVVVVVVV..', '.VVVPPPPVVV.', 'BWVVVVVVVVWB', 'BWWYYYYYYWWB', '.NNWWWWWWNN.', '.VVVVPPVVVV.', '..VVVVVVVV..', '....VVVV....', '............', '............', '............'],
    cottage: ['.....RR.....', '...RRRRRR...', '..RRRRRRRR..', '.RRRRRRRRRR.', '.WWWWWWWWWW.', '.WWBBWWBBWW.', '.WWWWKKKKWW.', '.WWWWKKKKWW.', '.GGGGGGGGGG.', '............', '............', '............'],
    sailboat: ['.....W......', '....WWR.....', '...WWWRR....', '..WWWWRRR...', '.....K......', '.RRRRRRRRRR.', '..RRRRRRRR..', 'NNNNNNNNNNNN', '.NNNNNNNNNN.', '............', '............', '............'],
    balloon: ['...RROORR...', '..RRYYYYRR..', '.RGGGGGGGGY.', '.RNNNNNNNNY.', '..VVVVVVVV..', '...WWWWWW...', '....K..K....', '....TTTT....', '....KKKK....', '............', '............', '............'],
    ghost: ['...WWWWWW...', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WWKKWWKKWW.', '.WWWWWWWWWW.', '.WWWWPPWWWW.', '.WWWWWWWWWW.', '.WWWWWWWWWW.', '.WW.WWWW.WW.', '.W...WW...W.', '............', '............'],
    pumpkin: ['.....GG.....', '.....GG.....', '..OOOOOOOO..', '.OOKOOOOKOO.', 'OOOOOOOOKOOO', 'OOOYOOOOYOOO', 'OOOOOOOOOOOO', '.OYYOYYOYYO.', '..OOOOOOOO..', '...OOOOOO...', '............', '............'],
    bat: ['K..........K', 'KK..K..K..KK', 'KKK.KKKK.KKK', 'KKKKKKKKKKKK', '.KKWKKKKWKK.', '..KKKKKKKK..', '...KK..KK...', '............', '............', '............', '............', '............'],
    snowflake: ['.....BB.....', '.B...BB...B.', '..B.BBBB.B..', '...BBBBBB...', '.BBBBWWBBBB.', 'BBBWWWWWWBBB', '.BBBBWWBBBB.', '...BBBBBB...', '..B.BBBB.B..', '.B...BB...B.', '.....BB.....', '............'],
    rainbow: ['..RRRRRRRR..', '.RROOOOOORR.', 'ROOYYYYYYOOR', 'ROYGGGGGGYOR', 'RYGBBBBBBYGR', 'RYBVVVVVVBYR', 'WW........WW', 'WWWW....WWWW', '............', '............', '............', '............'],
    castle: ['.RR......RR.', '.RR..YY..RR.', '.WWWWWWWWWW.', '.WVVWWWWVVW.', '.WWWWYYWWWW.', 'WWWWYYYYWWWW', 'WWKKKKKKKKWW', 'WWKKKKKKKKWW', 'GGGGGGGGGGGG', 'DDDDDDDDDDDD', '............', '............'],
    koi: ['...OOOOOO...', '.OOWWOOOWOO.', 'OOORROOOOOOO', '.OOOOOOOO...', '....BBBWWB..', '..BOOWWWOB..', '.BOOOOOOOOB.', '..BBROOOBB..', '....BBBB....', '............', '............', '............'],
    porcelain: ['...WWWWWW...', '....WNNW....', '...WWWWWW...', '..WWNNNNWW..', '.WWNBWWBNWW.', '.WWNNNNNNWW.', '..WWNNNNWW..', '...WWWWWW...', '...TTTTTT...', '............', '............', '............']
  };

  function createRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* 8类参数化异形图案生成器（生成上百种绝不重复的玫瑰花瓣、镜像萌怪、螺旋、星阵、宝塔） */
  function buildParametricArt(kind, size, pal, seed) {
    var art = [];
    var mid = (size - 1) / 2;
    var rng = createRng(seed || 101);
    var r, c;

    if (kind === 'symMonster') {
      /* 左右对称像素萌怪 / 机器人 / 甲虫面具 */
      var half = Math.ceil(size / 2);
      var gridM = [];
      for (r = 0; r < size; r += 1) {
        gridM.push(new Array(size));
        for (c = 0; c < size; c += 1) gridM[r][c] = '.';
      }
      for (r = 1; r < size - 1; r += 1) {
        for (c = 1; c < half; c += 1) {
          var dr = Math.abs(r - mid) / mid;
          var dc = Math.abs(c - mid) / mid;
          var prob = 0.85 - (dr * 0.55 + dc * 0.45);
          if (rng() < prob) {
            var ch = pal[Math.floor(rng() * Math.min(3, pal.length))];
            gridM[r][c] = ch;
            gridM[r][size - 1 - c] = ch;
          }
        }
      }
      /* 保证连通主干与可爱对称双眼 */
      var eyeR = Math.floor(size * 0.36);
      var eyeC = Math.floor(size * 0.3);
      for (r = 2; r < size - 2; r += 1) {
        gridM[r][half - 1] = pal[0];
        gridM[r][size - half] = pal[0];
      }
      gridM[eyeR][eyeC] = 'W';
      gridM[eyeR][size - 1 - eyeC] = 'W';
      if (eyeC + 1 < half) {
        gridM[eyeR][eyeC + 1] = 'K';
        gridM[eyeR][size - 2 - eyeC] = 'K';
      }
      for (r = 0; r < size; r += 1) art.push(gridM[r].join(''));
      return art;
    }

    for (r = 0; r < size; r += 1) {
      var row = '';
      for (c = 0; c < size; c += 1) {
        var dy = r - mid;
        var dx = c - mid;
        var adx = Math.abs(dx);
        var ady = Math.abs(dy);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var man = adx + ady;
        var ang = Math.atan2(dy, dx);
        var chOut = '.';

        if (kind === 'rose') {
          var petals = 4 + (seed % 5); /* 4~8瓣花朵 */
          var radius = mid * (0.58 + 0.36 * Math.cos(petals * ang));
          if (dist <= radius) {
            chOut = dist < 1.8 ? pal[pal.length - 1] : pal[Math.floor(dist / 2) % pal.length];
          }
        } else if (kind === 'spiral') {
          var arm = Math.sin(dist * 1.15 - ang * (2 + (seed % 2)));
          if (dist <= mid - 0.1 && (arm > -0.15 || dist < 1.8)) {
            chOut = pal[Math.floor(dist) % pal.length];
          }
        } else if (kind === 'diamondRing') {
          if (man <= mid + 0.6 && man >= 1.3) chOut = pal[Math.floor(man) % pal.length];
        } else if (kind === 'crossMandala') {
          if ((adx < 2.1 || ady < 2.1 || man <= mid - 0.7) && Math.max(adx, ady) <= mid) {
            chOut = pal[Math.floor(Math.max(adx, ady) + ady) % pal.length];
          }
        } else if (kind === 'flowerMandala') {
          if (dist <= mid + 0.15 && (adx < 1.6 || ady < 1.6 || Math.abs(adx - ady) < 1.4)) {
            chOut = pal[Math.floor(dist) % pal.length];
          }
        } else if (kind === 'steppedPyramid') {
          if (r >= 1 && r <= size - 2 && adx <= r * 0.64) {
            chOut = pal[Math.floor(r / 2) % pal.length];
          }
        } else if (kind === 'chevronWave') {
          if (r >= 1 && r <= size - 2 && c >= 1 && c <= size - 2) {
            chOut = pal[Math.floor((r + adx) / 2) % pal.length];
          }
        } else if (kind === 'hexCrest') {
          if (Math.max(adx, ady) <= mid - 0.3 && man <= mid * 1.45) {
            chOut = pal[(Math.floor(Math.max(adx, ady)) + (adx === ady ? 1 : 0)) % pal.length];
          }
        }
        row += chOut;
      }
      art.push(row);
    }
    return art;
  }

  /* 将 12×12 图形优雅放大/嵌框为 14×14（用于第17-18章大画幅） */
  function padTo14(art12) {
    var out = ['..............'];
    for (var r = 0; r < art12.length; r += 1) {
      out.push('.' + art12[r] + '.');
    }
    out.push('..............');
    return out;
  }

  /* 18章结构化配置生成器（共 360 关，题材与图形丰富多变、波浪难度曲线） */
  var SHAPE_KEYS = Object.keys(SHAPES);
  var REMAP_SETS = [
    null,
    { R: 'P', O: 'Y', B: 'G' },
    { R: 'V', B: 'N', Y: 'O' },
    { G: 'B', D: 'N', P: 'R' },
    { O: 'R', Y: 'W', K: 'V' },
    { B: 'T', P: 'O', G: 'Y' }
  ];

  var CHAPTER_THEMES = [
    /* Ch1: 街头小吃街 */
    [
      ['太阳煎蛋', 'miniegg'], ['草莓红心', 'miniheart'], ['Mini汉堡', 'burger'], ['粉霜甜甜圈', 'donut'],
      ['鲜甜草莓·挑战', 'strawberry'], ['清凉西瓜角', 'watermelon'], ['脆香薯条', 'fries'], ['黄金披萨角', 'pizza'],
      ['热狗三明治', 'hotdog'], ['珍珠奶茶·挑战', 'boba'], ['三文鱼寿司', 'sushi'], ['酥香牛角包', 'croissant'],
      ['鲜切牛油果', 'avocado'], ['黄金大菠萝', 'pineapple'], ['暖心拉面·挑战', 'ramen'], ['小肉粽饭团', 'onigiri'],
      ['元宝水饺', 'dumpling'], ['双生樱桃', 'cherry'], ['奶酪三角', 'cheese'], ['甜品总汇·终章', 'cupcake']
    ],
    /* Ch2: 甜品烘焙屋 */
    [
      ['草莓甜筒', 'icecream'], ['纸杯蛋糕', 'cupcake'], ['彩虹棒棒糖', 'lollipop'], ['爆米花杯', 'popcorn'],
      ['蜜糖罐罐·挑战', 'honeyjar'], ['抹茶甜甜圈', 'donut'], ['蓝莓蛋糕', 'cupcake'], ['焦糖牛角包', 'croissant'],
      ['香草甜筒', 'icecream'], ['奶油草莓·挑战', 'strawberry'], ['双色水饺', 'dumpling'], ['黄金奶酪', 'cheese'],
      ['波霸乌龙茶', 'boba'], ['薄荷棒棒糖', 'lollipop'], ['水果披萨·挑战', 'pizza'], ['巧克力汉堡', 'burger'],
      ['樱桃奶油', 'cherry'], ['蜂蜜吐司', 'honeyjar'], ['西瓜冰沙', 'watermelon'], ['甜心皇冠·终章', 'crown']
    ],
    /* Ch3: 萌宠动物园 */
    [
      ['橘猫团子', 'cat'], ['垂耳兔兔', 'bunny'], ['小黄鸭鸭', 'duck'], ['呆萌熊仔', 'bear'],
      ['大眼青蛙·挑战', 'frog'], ['粉猪猪仔', 'piggy'], ['毛绒小鸡', 'chick'], ['森林狐狸', 'fox'],
      ['树懒考拉', 'koala'], ['小恐龙·挑战', 'dino'], ['森林猫头鹰', 'owl'], ['花花蝴蝶', 'butterfly'],
      ['呆萌企鹅', 'penguin'], ['蓝猫团子', 'cat'], ['小粉兔兔·挑战', 'bunny'], ['黑熊乖乖', 'bear'],
      ['白羽小鸡', 'chick'], ['雪狐仙子', 'fox'], ['小猪甜心', 'piggy'], ['动物城堡·终章', 'castle']
    ],
    /* Ch4: 深海奇遇记 */
    [
      ['喷水蓝鲸', 'whale'], ['小粉章鱼', 'octopus'], ['横行大螃蟹', 'crab'], ['绿壳小海龟', 'turtle'],
      ['橘色热带鱼·挑战', 'fish'], ['海浪帆船', 'sailboat'], ['海盗船锚', 'anchor'], ['海底蓝钻', 'diamond'],
      ['企鹅冰山', 'penguin'], ['紫晶章鱼·挑战', 'octopus'], ['金鳞锦鲤', 'koi'], ['黄金螃蟹', 'crab'],
      ['深海小鲸', 'whale'], ['海龟岛屿', 'turtle'], ['秘境宝箱·挑战', 'chest'], ['热带神仙鱼', 'fish'],
      ['深蓝帆船', 'sailboat'], ['水手铁锚', 'anchor'], ['珊瑚花瓣', 'rose', 'P,R,Y,W'], ['海洋宫殿·终章', 'castle']
    ],
    /* Ch5: 森林植物园 */
    [
      ['雪松圣诞树', 'pinetree'], ['盆栽仙人掌', 'cactus'], ['红点蘑菇', 'mushroom'], ['金色向日葵', 'sunflower'],
      ['四叶幸运草·挑战', 'clover'], ['秋日红枫叶', 'maple'], ['粉嫩郁金香', 'tulip'], ['脆甜红苹果', 'apple'],
      ['满树樱花', 'sakura'], ['热带椰子树·挑战', 'palmtree'], ['脆甜胡萝卜', 'carrot'], ['青苹果园', 'apple'],
      ['蓝莓蘑菇', 'mushroom'], ['金黄秋枫', 'maple'], ['六瓣莲花·挑战', 'rose', 'P,W,Y,G'], ['紫罗兰盆栽', 'tulip'],
      ['森林小松树', 'pinetree'], ['雨后彩虹', 'rainbow'], ['八瓣森花', 'rose', 'G,D,Y,W'], ['植物城堡·终章', 'cottage']
    ],
    /* Ch6: 钥匙秘宝库 */
    [
      ['璀璨蓝钻', 'diamond'], ['黄金王冠', 'crown'], ['勇者长剑', 'sword'], ['皇家盾牌', 'shield'],
      ['海盗宝箱·挑战', 'chest'], ['粉色魔药瓶', 'potion'], ['黄金钥匙', 'key'], ['冠军奖杯', 'trophy'],
      ['时光沙漏', 'hourglass'], ['魔法水晶·挑战', 'crystal'], ['红宝石钻', 'diamond'], ['翡翠盾牌', 'shield'],
      ['秘银长剑', 'sword'], ['紫晶王冠', 'crown'], ['星辉宝箱·挑战', 'chest'], ['蓝魔药瓶', 'potion'],
      ['紫金奖杯', 'trophy'], ['秘钥沙漏', 'hourglass'], ['菱格徽章', 'diamondRing', 'Y,O,K,W'], ['黄金圣殿·终章', 'castle']
    ],
    /* Ch7: 国风百景图 */
    [
      ['元宵红灯笼', 'lantern'], ['锦绣团扇', 'fan'], ['青花瓷瓶', 'porcelain'], ['青瓷茶壶', 'teapot'],
      ['油纸花伞·挑战', 'umbrella'], ['锦鲤游春', 'koi'], ['朱红古塔', 'pagoda'], ['宫廷玉兔', 'bunny'],
      ['元宝饺子', 'dumpling'], ['御赐宝盒·挑战', 'chest'], ['喜庆粉灯笼', 'lantern'], ['水墨折扇', 'fan'],
      ['紫砂茶壶', 'teapot'], ['翠竹松影', 'pinetree'], ['青玉古塔·挑战', 'pagoda'], ['福星高照', 'star'],
      ['弦月幽亭', 'moon'], ['红伞漫步', 'umbrella'], ['祥云织锦', 'chevronWave', 'R,Y,O,W'], ['御花园·终章', 'crown']
    ],
    /* Ch8: 交通大冒险 */
    [
      ['红色小轿车', 'car'], ['复古蒸汽火车', 'train'], ['蓝天小飞机', 'plane'], ['太空火箭', 'rocket'],
      ['彩虹热气球·挑战', 'balloon'], ['破浪红帆船', 'sailboat'], ['海盗船锚', 'anchor'], ['外星飞碟', 'ufo'],
      ['极速跑车', 'car'], ['高铁列车·挑战', 'train'], ['云端客机', 'plane'], ['星际火箭', 'rocket'],
      ['森林小屋', 'cottage'], ['紫晶热气球', 'balloon'], ['双桅帆船·挑战', 'sailboat'], ['霓虹飞碟', 'ufo'],
      ['环游指南针', 'hexCrest', 'B,N,W,Y'], ['金字塔奇观', 'steppedPyramid', 'Y,O,T,K'], ['雪山松林', 'pinetree'], ['环球城堡·终章', 'castle']
    ],
    /* Ch9: 万花对称阵 */
    [
      ['红橙菱环', 'diamondRing', 'R,O,Y,W'], ['晴空十字窗', 'crossMandala', 'B,W,N,Y'], ['粉紫雪莲阵', 'flowerMandala', 'P,V,W,B'], ['暖阳金字塔', 'steppedPyramid', 'Y,O,T,K'],
      ['棱镜六角徽·挑战', 'hexCrest', 'B,V,P,Y'], ['森系波浪锦', 'chevronWave', 'G,D,Y,W'], ['五瓣樱花阵', 'rose', 'P,W,R'], ['深海螺旋阵', 'spiral', 'N,B,W'],
      ['七彩星轮', 'flowerMandala', 'R,O,Y,G,B'], ['皇家万花筒·挑战', 'diamondRing', 'N,Y,R,W'], ['薄荷织锦', 'chevronWave', 'B,G,W,Y'], ['紫晶塔尖', 'steppedPyramid', 'V,P,W,N'],
      ['六瓣雏菊阵', 'rose', 'W,Y,B'], ['金琥珀旋涡', 'spiral', 'O,Y,K'], ['双环翡翠印·挑战', 'crossMandala', 'D,G,T,W'], ['粉钻菱盾', 'hexCrest', 'P,R,W,Y'],
      ['极光浪纹', 'chevronWave', 'B,V,G,W'], ['八瓣太阳花', 'rose', 'Y,O,R'], ['星云旋涡', 'spiral', 'V,P,B'], ['万花圣坛·终章', 'diamondRing', 'V,P,B,Y,W']
    ],
    /* Ch10: 潮流音乐铺 */
    [
      ['胶片相机', 'camera'], ['掌上游戏机', 'gameboy'], ['头戴式耳机', 'headphones'], ['木质小吉他', 'guitar'],
      ['跃动音符·挑战', 'musicnote'], ['魔法小灯泡', 'lightbulb'], ['精装硬皮书', 'book'], ['潮流黑相机', 'camera'],
      ['薄荷游戏机', 'gameboy'], ['电音紫耳机·挑战', 'headphones'], ['摇滚红吉他', 'guitar'], ['双声道音符', 'musicnote'],
      ['灵感暖灯泡', 'lightbulb'], ['魔法秘典', 'book'], ['音浪波纹·挑战', 'chevronWave', 'V,R,O,Y,B'], ['蝴蝶结潮贴', 'butterfly'],
      ['草莓拍立得', 'camera'], ['星空掌机', 'gameboy'], ['彩虹唱片阵', 'diamondRing', 'K,R,W,B'], ['潮玩派对·终章', 'castle']
    ],
    /* Ch11: 魔法学院 */
    [
      ['尖顶巫师帽', 'wizardhat'], ['星辰魔法棒', 'wand'], ['樱粉魔药瓶', 'potion'], ['天蓝魔法晶', 'crystal'],
      ['魔法古书·挑战', 'book'], ['黄金魔钥', 'key'], ['许愿五角星', 'star'], ['新月法阵', 'moon'],
      ['睿智猫头鹰', 'owl'], ['闪电魔咒·挑战', 'lightning'], ['皇家魔盾', 'shield'], ['火焰长剑', 'sword'],
      ['暗夜宝箱', 'chest'], ['紫晶魔法帽', 'wizardhat'], ['黄金魔法棒·挑战', 'wand'], ['翠绿魔药', 'potion'],
      ['紫晶矿簇', 'crystal'], ['魔法星花', 'rose', 'V,P,Y,W'], ['时空沙漏', 'hourglass'], ['大法师塔·终章', 'pagoda']
    ],
    /* Ch12: 昆虫微观园 */
    [
      ['斑斓蝴蝶', 'butterfly'], ['小蜜蜂嗡嗡', 'bee'], ['七星瓢虫', 'ladybug'], ['慢悠悠蜗牛', 'snail'],
      ['翡翠甲虫·挑战', 'symMonster', 'G,D,Y'], ['蓝翼蝴蝶', 'butterfly'], ['黄金蜂王', 'bee'], ['橘色瓢虫', 'ladybug'],
      ['粉壳小蜗牛', 'snail'], ['红甲战虫·挑战', 'symMonster', 'R,K,O'], ['森林叶虫', 'symMonster', 'G,T,K'], ['紫翼彩蝶', 'butterfly'],
      ['大螯螃蟹', 'crab'], ['小花朵朵', 'sunflower'], ['四叶幸运草·挑战', 'clover'], ['蓝甲独角仙', 'symMonster', 'N,B,W'],
      ['红蘑菇屋', 'mushroom'], ['绿叶嫩芽', 'maple'], ['琥珀虫阵', 'flowerMandala', 'O,Y,K,T'], ['昆虫乐园·终章', 'cottage']
    ],
    /* Ch13: 像素怪兽工坊（20只绝不重样的算法镜像小萌怪！） */
    [
      ['果冻史莱姆', 'symMonster', 'B,W,N'], ['橘子机甲怪', 'symMonster', 'O,Y,K'], ['草莓泡泡怪', 'symMonster', 'R,P,W'], ['森林小精灵', 'symMonster', 'G,D,Y'],
      ['葡萄幻影怪·挑战', 'symMonster', 'V,P,W'], ['黄金小傀儡', 'symMonster', 'Y,O,K'], ['深海蓝怪兽', 'symMonster', 'N,B,W'], ['可可曲奇怪', 'symMonster', 'K,T,W'],
      ['樱花软糖怪', 'symMonster', 'P,W,R'], ['薄荷电波怪·挑战', 'symMonster', 'G,B,W'], ['熔岩小恶魔', 'symMonster', 'R,O,Y'], ['冰霜雪人怪', 'symMonster', 'B,W,P'],
      ['柠檬脆皮怪', 'symMonster', 'Y,G,W'], ['暗夜蝙蝠怪', 'symMonster', 'V,N,Y'], ['青苔石像怪·挑战', 'symMonster', 'D,G,T'], ['蜜桃小魔王', 'symMonster', 'P,O,W'],
      ['星云外星人', 'symMonster', 'N,V,Y'], ['糖霜饼干怪', 'symMonster', 'T,W,K'], ['宝石守护兽', 'symMonster', 'B,R,Y'], ['怪兽之王·终章', 'symMonster', 'R,Y,V']
    ],
    /* Ch14: 四季与天气 */
    [
      ['暖暖大太阳', 'sun'], ['软绵降雨云', 'cloud'], ['金色大闪电', 'lightning'], ['雨后七色彩虹', 'rainbow'],
      ['六角冰雪花·挑战', 'snowflake'], ['春樱漫舞', 'sakura'], ['盛夏西瓜', 'watermelon'], ['秋日红枫', 'maple'],
      ['冬日雪松', 'pinetree'], ['晴空热气球·挑战', 'balloon'], ['海风帆船', 'sailboat'], ['向日葵田', 'sunflower'],
      ['银杏落叶', 'maple'], ['雪人企鹅', 'penguin'], ['雷电星阵·挑战', 'flowerMandala', 'Y,N,B,W'], ['霓虹云朵', 'cloud'],
      ['太阳神徽', 'rose', 'Y,O,R'], ['冰晶万花筒', 'crossMandala', 'B,W,N'], ['四季花环', 'diamondRing', 'P,G,O,B'], ['气象城堡·终章', 'castle']
    ],
    /* Ch15: 几何建筑师 */
    [
      ['红砖小洋房', 'cottage'], ['朱檐古宝塔', 'pagoda'], ['埃及金字塔', 'steppedPyramid', 'Y,T,O,K'], ['梦幻游乐堡', 'castle'],
      ['黄金螺旋塔·挑战', 'spiral', 'Y,O,K'], ['十字教堂窗', 'crossMandala', 'R,Y,B,W'], ['六角棱镜楼', 'hexCrest', 'N,B,W,T'], ['双色波浪墙', 'chevronWave', 'K,T,W,O'],
      ['翡翠宝塔', 'pagoda'], ['蓝顶小屋·挑战', 'cottage'], ['玛雅阶梯阵', 'steppedPyramid', 'D,G,T,K'], ['水晶棱台', 'crystal'],
      ['星形城徽', 'flowerMandala', 'K,Y,R,W'], ['海蓝旋涡池', 'spiral', 'N,B,W'], ['钻石穹顶·挑战', 'diamondRing', 'B,W,N,Y'], ['红金王座', 'crown'],
      ['古桥灯影', 'lantern'], ['风车花园', 'rose', 'R,W,B,G'], ['几何神盾', 'shield'], ['建筑巅峰·终章', 'castle']
    ],
    /* Ch16: 万圣奇幻夜（星夜主题） */
    [
      ['笑脸南瓜灯', 'pumpkin'], ['萌萌小幽灵', 'ghost'], ['夜行小蝙蝠', 'bat'], ['弯弯月牙儿', 'moon'],
      ['女巫尖顶帽·挑战', 'wizardhat'], ['荧光魔药水', 'potion'], ['魔法猫头鹰', 'owl'], ['星夜许愿星', 'star'],
      ['幽光水晶', 'crystal'], ['黑夜城堡·挑战', 'castle'], ['幽灵糖果', 'lollipop'], ['暗夜魔剑', 'sword'],
      ['黄金魔钥', 'key'], ['星空魔方阵', 'crossMandala', 'V,P,N,Y'], ['飞碟夜巡·挑战', 'ufo'], ['鬼魅骷髅怪', 'symMonster', 'W,K,V'],
      ['星光魔法棒', 'wand'], ['南瓜宝箱', 'chest'], ['午夜旋涡', 'spiral', 'V,N,Y'], ['万圣之夜·终章', 'pumpkin']
    ],
    /* Ch17: 星际漫游（14x14 大画幅） */
    [
      ['探索火箭号', 'rocket'], ['土星大光环', 'saturn'], ['银色飞碟', 'ufo'], ['星际许愿星', 'star'],
      ['银河旋涡·挑战', 'spiral', 'N,B,W,Y'], ['星海蓝鲸', 'whale'], ['星际电波怪', 'symMonster', 'B,V,Y'], ['流星闪电', 'lightning'],
      ['太空水晶', 'crystal'], ['太阳耀斑·挑战', 'sun'], ['紫晶星云', 'rose', 'V,P,B,Y'], ['太空蝴蝶', 'butterfly'],
      ['航天城堡', 'castle'], ['极光灯笼', 'lantern'], ['宇宙罗盘·挑战', 'flowerMandala', 'N,B,G,Y,V'], ['双环土星', 'saturn'],
      ['星尘皇冠', 'crown'], ['黑洞迷宫', 'diamondRing', 'N,V,B,W'], ['太阳帆船', 'sailboat'], ['银河舰队·终章', 'rocket']
    ],
    /* Ch18: 蚁后皇家殿堂（14x14 全机关巅峰） */
    [
      ['黄金皇家冠', 'crown'], ['星夜金殿', 'castle'], ['秘银魔剑', 'sword'], ['皇家圣盾', 'shield'],
      ['传国宝盒·挑战', 'chest'], ['翡翠花窗', 'crossMandala', 'G,D,Y,W'], ['赤金锦鲤', 'koi'], ['圣洁雪莲', 'rose', 'W,P,Y,B'],
      ['冰晶雪花', 'snowflake'], ['星辰冠军杯·挑战', 'trophy'], ['时空沙漏', 'hourglass'], ['星夜天坛', 'pagoda'],
      ['魔幻龙晶', 'crystal'], ['九天彩虹', 'rainbow'], ['万花王座·挑战', 'hexCrest', 'N,V,P,Y,B'], ['蚁后守护神', 'symMonster', 'Y,R,V'],
      ['星海旋涡', 'spiral', 'Y,O,V,N'], ['宇宙飞船', 'rocket'], ['梦幻热气球', 'balloon'], ['蚁后荣耀殿堂·大结局', 'castle']
    ]
  ];

  /* 自动构建 360 关规格 */
  var LEVEL_SPECS = [];
  for (var chIdx = 0; chIdx < CHAPTER_THEMES.length; chIdx += 1) {
    var chNum = chIdx + 1;
    var items = CHAPTER_THEMES[chIdx];
    for (var lvIdx = 0; lvIdx < items.length; lvIdx += 1) {
      var tuple = items[lvIdx];
      var lvInCh = lvIdx + 1;
      var isSpike = (lvInCh % 5 === 0);
      var spec = {
        name: tuple[0],
        chapter: chNum,
        large: chNum >= 17
      };
      var motifOrGeo = tuple[1];
      if (tuple[2]) {
        spec.geo = [motifOrGeo, chNum >= 17 ? 14 : 12, tuple[2].split(',')];
      } else {
        spec.motif = motifOrGeo;
        /* 给同名母版分配差异化配色变奏 */
        var remapPick = REMAP_SETS[(chIdx + lvIdx) % REMAP_SETS.length];
        if (lvIdx > 5 && remapPick) spec.remap = remapPick;
      }

      /* 章节渐进机制 + 波浪难度 */
      if (chNum === 1 && isSpike) spec.doubleRate = 0.08;
      if (chNum >= 2) spec.doubleRate = Math.min(0.26, 0.1 + chNum * 0.008 + (isSpike ? 0.06 : 0));
      if (chNum >= 4 && chNum <= 5) spec.mudRate = 0.14 + (isSpike ? 0.08 : 0);
      if (chNum === 6 || chNum === 11 || chNum === 18) {
        spec.hasKey = true;
        spec.lockRate = 0.15 + (isSpike ? 0.06 : 0);
      }
      if (chNum === 7 || chNum === 11 || chNum === 16) spec.wrapRate = 0.16 + (isSpike ? 0.06 : 0);
      if (chNum >= 10) spec.mysteryRate = Math.min(0.24, 0.12 + (isSpike ? 0.06 : 0));
      if (chNum >= 6 || (isSpike && (spec.mudRate || spec.wrapRate))) spec.allowBomber = true;
      if (chNum >= 14 && chNum % 2 === 0 && !spec.mudRate && !spec.wrapRate) spec.mudRate = 0.16;
      if (chNum === 16 || chNum === 18) spec.nightTheme = true;

      LEVEL_SPECS.push(spec);
    }
  }

  function createRng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* 把异形剪影在网格内水平+垂直居中，消除扁平图案下方大片留白 */
  function centerArt(art) {
    var rows = art.length;
    var cols = art[0].length;
    var minR = rows, maxR = -1, minC = cols, maxC = -1;
    var r, c;
    for (r = 0; r < rows; r += 1) {
      for (c = 0; c < cols; c += 1) {
        if (art[r][c] !== '.') {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (maxR < 0) return art;
    var offR = Math.floor((rows - (maxR - minR + 1)) / 2) - minR;
    var offC = Math.floor((cols - (maxC - minC + 1)) / 2) - minC;
    if (offR === 0 && offC === 0) return art;
    var out = [];
    for (r = 0; r < rows; r += 1) {
      var rowChars = '';
      for (c = 0; c < cols; c += 1) {
        var sr = r - offR;
        var sc = c - offC;
        rowChars += (sr >= 0 && sr < rows && sc >= 0 && sc < cols) ? art[sr][sc] : '.';
      }
      out.push(rowChars);
    }
    return out;
  }

  function resolveArt(spec, seed) {
    if (spec.geo) {
      return centerArt(buildParametricArt(spec.geo[0], spec.geo[1], spec.geo[2], seed));
    }
    var baseArt = centerArt(SHAPES[spec.motif] || SHAPES.egg);
    return spec.large ? padTo14(baseArt) : baseArt;
  }

  function buildGridFromSpec(spec, levelId) {
    var art = resolveArt(spec, levelId * 131 + 17);
    var rows = art.length;
    var cols = art[0].length;
    var rng = createRng(levelId * 977 + rows * 31);
    var remap = spec.remap || null;
    var grid = [];
    var r, c;

    for (r = 0; r < rows; r += 1) {
      var row = [];
      for (c = 0; c < cols; c += 1) {
        var rawCh = art[r][c];
        var ch = (remap && remap[rawCh]) ? remap[rawCh] : rawCh;
        if (!ch || ch === '.' || !PALETTE[ch]) {
          row.push(null);
          continue;
        }
        row.push({
          color: ch,
          layers: 1,
          maxLayers: 1,
          mud: false,
          wrapped: false,
          key: false,
          locked: false,
          origColor: ch
        });
      }
      grid.push(row);
    }

    for (r = 1; r < rows - 1; r += 1) {
      for (c = 1; c < cols - 1; c += 1) {
        var cell = grid[r][c];
        if (!cell) continue;
        var hasFourNeighbors = !!(grid[r - 1][c] && grid[r + 1][c] && grid[r][c - 1] && grid[r][c + 1]);
        if (!hasFourNeighbors) continue;
        if (spec.doubleRate && rng() < spec.doubleRate) {
          cell.layers = 2;
          cell.maxLayers = 2;
        }
        if (spec.mudRate && cell.layers === 1 && rng() < spec.mudRate) {
          cell.mud = true;
        } else if (spec.wrapRate && cell.layers === 1 && rng() < spec.wrapRate) {
          cell.wrapped = true;
        }
      }
    }

    if (spec.hasKey) {
      var initialExp = findExposedCells(grid);
      if (initialExp.length > 0) {
        /* 把钥匙优先放在最外露的主色上，锁住其余辅助色与内层核心 */
        var kFreq = {};
        for (var kf = 0; kf < initialExp.length; kf += 1) {
          kFreq[initialExp[kf].cell.color] = (kFreq[initialExp[kf].cell.color] || 0) + 1;
        }
        initialExp.sort(function (a, b) {
          return (kFreq[b.cell.color] || 0) - (kFreq[a.cell.color] || 0);
        });
        var kCell = initialExp[Math.floor(initialExp.length * 0.2)].cell;
        kCell.key = true;
      }
      var lockLimit = Math.max(3, Math.round((rows * cols) * (spec.lockRate || 0.14) * 0.32));
      var locksPlaced = 0;
      for (r = 0; r < rows && locksPlaced < lockLimit; r += 1) {
        for (c = 0; c < cols && locksPlaced < lockLimit; c += 1) {
          var lc = grid[r][c];
          if (!lc || lc.key || lc.mud || lc.wrapped) continue;
          if (kCell && lc.color === kCell.color) continue;
          var inner4 = (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) && !!(grid[r - 1][c] && grid[r + 1][c] && grid[r][c - 1] && grid[r][c + 1]);
          /* 钥匙关也可锁住非钥匙主色的外围零星色块，逼玩家优先找 K 钥匙开锁 */
          if ((inner4 || levelId >= 10) && rng() < (spec.lockRate || 0.22)) {
            lc.locked = true;
            locksPlaced += 1;
          }
        }
      }
    }

    /* 中高阶障碍关：允许把“非第一主色”的零星外露块也包上泥壳/礼物纸，必须先清主色边界再震开 */
    if (levelId >= 10 && (spec.mudRate || spec.wrapRate)) {
      var expNow = findExposedCells(grid);
      var freqExp = {};
      var domColor = null;
      var domMax = 0;
      for (var fe = 0; fe < expNow.length; fe += 1) {
        var fc = expNow[fe].cell.color;
        freqExp[fc] = (freqExp[fc] || 0) + 1;
        if (freqExp[fc] > domMax) {
          domMax = freqExp[fc];
          domColor = fc;
        }
      }
      if (Object.keys(freqExp).length >= 2 && domMax >= 4) {
        for (var ei = 0; ei < expNow.length; ei += 1) {
          var exObj = expNow[ei];
          var ec = exObj.cell;
          if (ec.color === domColor || ec.key || ec.layers > 1) continue;
          /* 确认至少有一个同色或非障碍邻居存在，保证拆开邻居后一定能震碎它 */
          var hasUnblockedNeighbor = false;
          var ndirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var nd = 0; nd < 4; nd += 1) {
            var nrr = exObj.r + ndirs[nd][0];
            var ncc = exObj.c + ndirs[nd][1];
            if (nrr >= 0 && nrr < rows && ncc >= 0 && ncc < cols && grid[nrr][ncc] && !grid[nrr][ncc].mud && !grid[nrr][ncc].wrapped) {
              hasUnblockedNeighbor = true;
              break;
            }
          }
          if (!hasUnblockedNeighbor) continue;
          if (spec.mudRate) ec.mud = true;
          else if (spec.wrapRate) ec.wrapped = true;
        }
      }
    }

    return grid;
  }

  function findExposedCells(grid) {
    var rows = grid.length;
    var cols = grid[0].length;
    var visited = [];
    var exposedSeen = [];
    var queue = [];
    var exposed = [];
    var r, c;
    for (r = 0; r < rows; r += 1) {
      visited.push(new Array(cols));
      exposedSeen.push(new Array(cols));
    }

    function tryPerimeterCell(pr, pc) {
      var cell = grid[pr][pc];
      if (cell === null) {
        if (!visited[pr][pc]) {
          visited[pr][pc] = true;
          queue.push([pr, pc]);
        }
      } else if (!cell.mud && !cell.locked && !cell.wrapped && !exposedSeen[pr][pc]) {
        exposedSeen[pr][pc] = true;
        exposed.push({ r: pr, c: pc, cell: cell });
      }
    }

    for (c = 0; c < cols; c += 1) {
      tryPerimeterCell(0, c);
      tryPerimeterCell(rows - 1, c);
    }
    for (r = 1; r < rows - 1; r += 1) {
      tryPerimeterCell(r, 0);
      tryPerimeterCell(r, cols - 1);
    }

    var head = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (head < queue.length) {
      var cur = queue[head];
      head += 1;
      for (var d = 0; d < 4; d += 1) {
        var nr = cur[0] + dirs[d][0];
        var nc = cur[1] + dirs[d][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        var neighbor = grid[nr][nc];
        if (neighbor === null) {
          if (!visited[nr][nc]) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        } else if (!neighbor.mud && !neighbor.locked && !neighbor.wrapped && !exposedSeen[nr][nc]) {
          exposedSeen[nr][nc] = true;
          exposed.push({ r: nr, c: nc, cell: neighbor });
        }
      }
    }
    return exposed;
  }

  function cloneSimGrid(grid) {
    var out = [];
    for (var r = 0; r < grid.length; r += 1) {
      var row = [];
      for (var c = 0; c < grid[r].length; c += 1) {
        var cell = grid[r][c];
        row.push(cell ? {
          color: cell.color,
          layers: cell.layers,
          mud: cell.mud,
          wrapped: cell.wrapped,
          key: cell.key,
          locked: cell.locked
        } : null);
      }
      out.push(row);
    }
    return out;
  }

  function unlockSimLocks(grid) {
    for (var r = 0; r < grid.length; r += 1) {
      for (var c = 0; c < grid[r].length; c += 1) {
        if (grid[r][c] && grid[r][c].locked) grid[r][c].locked = false;
      }
    }
  }

  function crackAdjacentSimObstacles(grid, r, c) {
    var rows = grid.length;
    var cols = grid[0].length;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var d = 0; d < 4; d += 1) {
      var nr = r + dirs[d][0];
      var nc = c + dirs[d][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        var cell = grid[nr][nc];
        if (cell) {
          if (cell.mud) cell.mud = false;
          if (cell.wrapped) cell.wrapped = false;
        }
      }
    }
  }

  function runSimDock(simGrid, dock) {
    var progressed = true;
    while (progressed) {
      progressed = false;
      var exposed = findExposedCells(simGrid);
      for (var i = 0; i < dock.length; i += 1) {
        if (dock[i].count <= 0) continue;
        for (var j = 0; j < exposed.length; j += 1) {
          var ex = exposed[j];
          var gCell = simGrid[ex.r][ex.c];
          if (gCell && gCell.color === dock[i].color) {
            gCell.layers -= 1;
            if (gCell.layers <= 0) {
              var wasKey = gCell.key;
              simGrid[ex.r][ex.c] = null;
              if (wasKey) unlockSimLocks(simGrid);
              crackAdjacentSimObstacles(simGrid, ex.r, ex.c);
            }
            dock[i].count -= 1;
            progressed = true;
            break;
          }
        }
        if (progressed) break;
      }
      for (var k = dock.length - 1; k >= 0; k -= 1) {
        if (dock[k].count <= 0) dock.splice(k, 1);
      }
    }
  }

  function countRemainingCarries(grid) {
    var total = 0;
    for (var r = 0; r < grid.length; r += 1) {
      for (var c = 0; c < grid[r].length; c += 1) {
        if (grid[r][c]) total += grid[r][c].layers;
      }
    }
    return total;
  }

  function generateSolvablePool(grid, mysteryRate, seed, allowBomber, levelId) {
    var simGrid = cloneSimGrid(grid);
    var rng = createRng(seed);
    var dock = [];
    var sequence = [];
    var guard = 0;
    var lv = levelId || 1;
    var tier = lv <= 5 ? 0 : (lv <= 30 ? 1 : 2);

    while (countRemainingCarries(simGrid) > 0 && guard < 450) {
      guard += 1;
      var exposed = findExposedCells(simGrid);
      if (exposed.length === 0) break;

      var colorCounts = {};
      var keyColors = {};
      var exposedColors = [];
      for (var i = 0; i < exposed.length; i += 1) {
        var col = exposed[i].cell.color;
        if (exposed[i].cell.key) keyColors[col] = true;
        if (!colorCounts[col]) {
          colorCounts[col] = 0;
          exposedColors.push(col);
        }
        colorCounts[col] += 1;
      }

      exposedColors.sort(function (a, b) {
        if (keyColors[a] !== keyColors[b]) return keyColors[a] ? -1 : 1;
        return colorCounts[b] - colorCounts[a];
      });
      var pickIdx = (exposedColors.length > 1 && !keyColors[exposedColors[0]] && rng() < 0.35) ? 1 : 0;
      var chosenColor = exposedColors[pickIdx];
      var directAvail = colorCounts[chosenColor];
      var squadSize;

      if (tier === 0) {
        if (dock.length >= 2) {
          squadSize = Math.min(directAvail, 3 + Math.floor(rng() * 5));
        } else {
          var totalColorNeed0 = 0;
          for (var r0 = 0; r0 < simGrid.length; r0 += 1) {
            for (var c00 = 0; c00 < simGrid[r0].length; c00 += 1) {
              if (simGrid[r0][c00] && simGrid[r0][c00].color === chosenColor) {
                totalColorNeed0 += simGrid[r0][c00].layers;
              }
            }
          }
          var targetBatch0 = Math.min(totalColorNeed0, directAvail + Math.floor(rng() * 3));
          squadSize = Math.max(1, Math.min(targetBatch0, 10));
        }
      } else {
        /* 策略期拆小每队携块量，提高槽位与颜色规划密度 */
        var maxSq = tier === 1 ? 5 : 4;
        var minSq = tier === 1 ? 3 : 2;
        squadSize = Math.max(1, Math.min(directAvail, minSq + Math.floor(rng() * (maxSq - minSq + 1))));
      }

      var testGrid = cloneSimGrid(simGrid);
      var testDock = [];
      for (var d = 0; d < dock.length; d += 1) {
        testDock.push({ color: dock[d].color, count: dock[d].count });
      }
      testDock.push({ color: chosenColor, count: squadSize });
      runSimDock(testGrid, testDock);
      if (testDock.length > 3) {
        squadSize = tier === 0 ? directAvail : Math.max(1, Math.min(directAvail, tier === 1 ? 4 : 3));
        testGrid = cloneSimGrid(simGrid);
        testDock = [];
        for (var d2 = 0; d2 < dock.length; d2 += 1) {
          testDock.push({ color: dock[d2].color, count: dock[d2].count });
        }
        testDock.push({ color: chosenColor, count: squadSize });
        runSimDock(testGrid, testDock);
      }

      simGrid = testGrid;
      dock = testDock;
      sequence.push({
        color: chosenColor,
        count: squadSize,
        kind: 'normal',
        mystery: false
      });
    }

    var safety = 0;
    while ((countRemainingCarries(simGrid) > 0 || dock.length > 0) && safety < 100) {
      safety += 1;
      var remExp = findExposedCells(simGrid);
      if (remExp.length === 0) break;
      var c0 = remExp[0].cell.color;
      var cnt = 0;
      for (var x = 0; x < remExp.length; x += 1) {
        if (remExp[x].cell.color === c0) cnt += 1;
      }
      if (tier > 0) cnt = Math.max(1, Math.min(cnt, tier === 1 ? 5 : 4));
      dock.push({ color: c0, count: cnt });
      runSimDock(simGrid, dock);
      sequence.push({
        color: c0,
        count: cnt,
        kind: 'normal',
        mystery: false
      });
    }

    var mysteryCount = 0;
    for (var sIdx = 0; sIdx < sequence.length; sIdx += 1) {
      if (allowBomber && sIdx > 1 && sIdx % 6 === 2) {
        sequence[sIdx].kind = 'bomber';
      }
      if (mysteryRate > 0 && sIdx >= 4 && mysteryCount < Math.ceil(sequence.length * mysteryRate) && rng() < mysteryRate) {
        sequence[sIdx].mystery = true;
        mysteryCount += 1;
      }
    }

    var visibleCount = Math.min(8, sequence.length);
    var visiblePool;
    var reserveDeck;

    if (tier === 0 || sequence.length <= visibleCount) {
      visiblePool = sequence.slice(0, visibleCount);
      reserveDeck = sequence.slice(visibleCount);
    } else {
      /* 策略难度设计：初期仅留 2-4 支外围起手队，其余槽位混入深层内芯颜色，乱点极易堵满槽位 */
      var initExp = findExposedCells(grid);
      var initExpColors = {};
      for (var ie = 0; ie < initExp.length; ie += 1) {
        initExpColors[initExp[ie].cell.color] = true;
      }

      var openerNeed = tier === 1 ? 3 : (sequence.length >= 14 ? 1 : 2);
      var decoyTarget = visibleCount - openerNeed;
      var usedIndices = {};
      visiblePool = [];
      for (var oi = 0; oi < openerNeed && oi < sequence.length; oi += 1) {
        visiblePool.push(sequence[oi]);
        usedIndices[oi] = true;
      }

      /* 先从后半段优先抽取开局未外露的颜色作为诱饵，再补普通后置队伍 */
      var startSearch = Math.max(openerNeed, Math.floor(sequence.length * 0.42));
      for (var pass = 0; pass < 2 && visiblePool.length < visibleCount; pass += 1) {
        for (var di = sequence.length - 1; di >= startSearch && visiblePool.length < visibleCount; di -= 1) {
          if (usedIndices[di]) continue;
          var isCovered = !initExpColors[sequence[di].color];
          if ((pass === 0 && isCovered) || pass === 1) {
            visiblePool.push(sequence[di]);
            usedIndices[di] = true;
          }
        }
      }
      for (var fi = 0; fi < sequence.length && visiblePool.length < visibleCount; fi += 1) {
        if (!usedIndices[fi]) {
          visiblePool.push(sequence[fi]);
          usedIndices[fi] = true;
        }
      }

      reserveDeck = [];
      for (var ri = 0; ri < sequence.length; ri += 1) {
        if (!usedIndices[ri]) reserveDeck.push(sequence[ri]);
      }
    }

    for (var sh = visiblePool.length - 1; sh > 0; sh -= 1) {
      var sw = Math.floor(rng() * (sh + 1));
      var tmp = visiblePool[sh];
      visiblePool[sh] = visiblePool[sw];
      visiblePool[sw] = tmp;
    }

    return {
      visiblePool: visiblePool,
      reserveDeck: reserveDeck
    };
  }

  function getLevelConfig(levelId) {
    var idx = Math.max(0, Math.min(LEVEL_SPECS.length - 1, (levelId || 1) - 1));
    var id = idx + 1;
    var spec = LEVEL_SPECS[idx];
    var chapter = spec.chapter;
    var grid = buildGridFromSpec(spec, id);
    var poolData = generateSolvablePool(
      grid,
      spec.mysteryRate || 0,
      id * 4099 + 17,
      !!spec.allowBomber,
      id
    );
    var chapterInfo = CHAPTERS[chapter - 1] || CHAPTERS[0];
    var baseSlots = id <= 5 ? 5 : ((id <= 40 && id % 5 !== 0) ? 4 : 3);
    if (id > 5 && id < 10 && id % 5 === 0) baseSlots = 4;
    return {
      id: id,
      chapter: chapter,
      chapterName: chapterInfo.name,
      name: spec.name,
      nightTheme: !!spec.nightTheme,
      rows: grid.length,
      cols: grid[0].length,
      grid: grid,
      visiblePool: poolData.visiblePool,
      reserveDeck: poolData.reserveDeck,
      baseSlots: baseSlots,
      isEndless: false
    };
  }

  function getArtworkPreview(levelId) {
    var idx = Math.max(0, Math.min(LEVEL_SPECS.length - 1, (levelId || 1) - 1));
    var id = idx + 1;
    var spec = LEVEL_SPECS[idx];
    var chapter = spec.chapter;
    var chapterInfo = CHAPTERS[chapter - 1] || CHAPTERS[0];
    var art = resolveArt(spec, id * 131 + 17);
    var rows = art.length;
    var cols = art[0].length;
    var remap = spec.remap || null;
    var grid = [];
    for (var r = 0; r < rows; r += 1) {
      var row = [];
      for (var c = 0; c < cols; c += 1) {
        var rawCh = art[r][c];
        var ch = (remap && remap[rawCh]) ? remap[rawCh] : rawCh;
        row.push((ch && ch !== '.' && PALETTE[ch]) ? { origColor: ch } : null);
      }
      grid.push(row);
    }
    return {
      id: id,
      chapter: chapter,
      chapterName: chapterInfo.name,
      name: spec.name,
      nightTheme: !!spec.nightTheme,
      rows: rows,
      cols: cols,
      grid: grid
    };
  }

  function getEndlessConfig(stageNum) {
    var variants = ['diamondRing', 'crossMandala', 'flowerMandala', 'hexCrest', 'chevronWave', 'rose', 'spiral', 'symMonster'];
    var size = stageNum % 2 === 1 ? 12 : 14;
    var rng = createRng(stageNum * 131071 + 919);
    var colorKeys = Object.keys(PALETTE);
    var palettePick = [];
    while (palettePick.length < 5) {
      var k = colorKeys[Math.floor(rng() * colorKeys.length)];
      if (palettePick.indexOf(k) === -1) palettePick.push(k);
    }
    var spec = {
      name: '无尽秘境 #' + stageNum,
      geo: [variants[stageNum % variants.length], size, palettePick],
      doubleRate: Math.min(0.24, 0.08 + stageNum * 0.02),
      mudRate: Math.min(0.2, 0.06 + stageNum * 0.02),
      wrapRate: Math.min(0.16, 0.04 + stageNum * 0.015),
      hasKey: stageNum >= 2,
      lockRate: 0.14,
      mysteryRate: Math.min(0.22, 0.08 + stageNum * 0.02),
      nightTheme: stageNum % 4 === 0,
      allowBomber: true
    };
    var grid = buildGridFromSpec(spec, 1000 + stageNum);
    var poolData = generateSolvablePool(grid, spec.mysteryRate, (1000 + stageNum) * 7919, true, 1000 + stageNum);
    return {
      id: 1000 + stageNum,
      endlessStage: stageNum,
      chapter: 18,
      chapterName: '无尽挑战',
      name: spec.name,
      nightTheme: spec.nightTheme,
      rows: grid.length,
      cols: grid[0].length,
      grid: grid,
      visiblePool: poolData.visiblePool,
      reserveDeck: poolData.reserveDeck,
      baseSlots: 3,
      isEndless: true
    };
  }

  global.AntLevels = {
    PALETTE: PALETTE,
    CHAPTERS: CHAPTERS,
    TOTAL_LEVELS: LEVEL_SPECS.length,
    getMetaList: function () {
      var list = [];
      for (var i = 0; i < LEVEL_SPECS.length; i += 1) {
        list.push({
          id: i + 1,
          chapter: LEVEL_SPECS[i].chapter,
          name: LEVEL_SPECS[i].name
        });
      }
      return list;
    },
    getArtworkPreview: getArtworkPreview,
    getLevelConfig: getLevelConfig,
    getEndlessConfig: getEndlessConfig,
    findExposedCells: findExposedCells
  };
})(window);
