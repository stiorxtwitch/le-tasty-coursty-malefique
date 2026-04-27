/* ═══════════════════════════════════════════════
   GAME.JS — Moteur principal du jeu
   Nico et le TastyCrousty Maléfique
   ═══════════════════════════════════════════════ */
'use strict';

// ════════════════════════════════════════════════
// 1. ÉTAT GLOBAL
// ════════════════════════════════════════════════
const G = {
  chapter: 0,       // 0=menu, 1=acte1, 2=acte2, 3=acte3, 4=acte4, 5=final, 6=épilogue
  scene: '',
  inventory: [],    // string ids
  notes: [],        // string ids
  flags: {},        // boolean flags for story progress
  selectedItem: null,
  paused: false,
  dialogActive: false,
  puzzleActive: false,
  sceneCanvas: null,
  sceneCtx: null,
  menuCanvas: null,
  menuCtx: null,
  screamerCanvas: null,
  screamerCtx: null,
  sceneAnim: null,
  menuAnim: null,
  flickerTimer: null,
  heartbeatTimer: null,
  options: { volume:0.7, brightness:0.8 },
};

// ════════════════════════════════════════════════
// 2. NOTES / LORE DOCUMENTS
// ════════════════════════════════════════════════
const NOTES_DATA = {
  note_memo_w1: {
    title: 'Mémo Interne — TastyCrousty Industries, 2018',
    body: `À : Tous les employés de l'usine N°4
De : Dr. Viktor Grunholt, Chef de Projet X-77

Concerne : Lot de production #666

Nous avons rencontré des "anomalies comportementales" dans la cuve de fermentation Nº6.
Les échantillons du lot #666 présentent une résistance anormale à la péremption — voire une
CROISSANCE après la date limite de consommation.

Jusqu'à nouvel ordre, NE PAS distribuer le lot #666.
NE PAS consommer les produits de ce lot.
NE PAS approcher la cuve Nº6 sans combinaison de niveau 3.

Si vous entendez des bruits provenant des entrepôts de nuit...
IGNOREZ-LES.

— Dr. V. Grunholt`
  },

  note_journal_day1: {
    title: 'Journal de Viktor Grunholt — Jour 1',
    body: `Aujourd'hui nous avons commencé l'expérience.

L'idée est simple : stabiliser la molécule gustative du TastyCrousty en y ajoutant
le composé organique X-77. L'objectif était d'en faire le snack le plus addictif du siècle.

Nous n'aurions pas dû.

Le composé X-77 réagit avec les épices de manière... inattendue.
Les cellules du snack semblent... se diviser.

Bête et discipline scientifique. J'ignore mes instincts.
Après tout, un crouton ne peut pas être... vivant.

— Grunholt`
  },

  note_journal_day47: {
    title: 'Journal de Viktor Grunholt — Jour 47',
    body: `Ça a poussé.

Ça a poussé pendant la nuit. Personne n'était là.
Seize boîtes du lot #666 ont été vidées de l'intérieur.
Les murs de la cuve... portent des marques.

Des employés ont rapporté des bruits. Des craquements.
Comme si quelque chose machait dans les murs.

J'ai prié pour que ce soit des rats.
Ce ne sont pas des rats.

L'équipe R&D est réduite à 3 personnes.
Les autres ont... démissionné. Ou ont disparu.

J'ai contacté le sujet "F" — l'employé 447.
Il est le seul qui peut encore approcher la cuve sans réaction de l'entité.
Pour des raisons que nous ne comprenons pas encore.

"Il mange tout", disent ses collègues.
Peut-être que c'est exactement ce qu'il nous faut.

— Grunholt`
  },

  note_warning_flamby: {
    title: 'Dossier Confidentiel — Sujet F (Employé 447)',
    body: `NOM DE CODE : FLAMBY
Statut : ACTIF — Protocole Sauveur

L'employé 447, dit "Flamby", présente une résistance biologique inexpliquée
à toutes les toxines alimentaires connues.

Tests réalisés :
• A consommé 47 croutons du Lot #666 sans effets.
• Immunité totale aux composés X-77.
• Capacité gastrique estimée : HORS NORME.

THÉORIE DU DIRECTEUR SCIENTIFIQUE :
Si le TastyCrousty Maléfique est une entité alimentaire, seul quelqu'un
possédant le "Ventre de Fer" peut l'absorber totalement.

Le TastyCrousty se nourrit de la peur des autres.
Flamby... ne connaît pas la peur. Il connaît l'appétit.

EN CAS DE CATASTROPHE : Contactez Flamby.
Laissez-le manger.

— Archive R&D, TastyCrousty Industries`
  },

  note_scratched: {
    title: 'Griffonnage sur un mur — encre rouge (ou autre chose)',
    body: `ne partez pas ne partez pas ne partez pas
il revient quand on éteint les lumières
il vient quand on mange après minuit
le snack vous choisit
vous ne choisissez pas le snack

Flamby sait.
Trouvez Flamby.
TROUVEZ FLAMBY avant qu'il ne vous trouve.

ça croque dans le noir
ça CROQUE DANS LE NOIR`
  },

  note_ritual: {
    title: 'Protocole de Confinement — ULTRA SECRET',
    body: `Pour confiner ou détruire l'entité TastyCrousty (Lot #666) :

1. Rassemblez les trois artefacts de liaison :
   - Le fragment de cuve originale (Cuve Nº6)
   - La formule X-77 manuscrite (Bureau du directeur)
   - Le sceau TastyCrousty originel (Archives)

2. Placez-les dans le cercle rituel de la Chambre Souterraine.

3. ATTENDEZ LE SAUVEUR.

Note : Si le Sauveur est disponible, ignorez les étapes 1-3.
       Laissez juste Flamby manger.
       Ça fonctionne.

— Protocole R&D Final, signé illisiblement`
  }
};

// ════════════════════════════════════════════════
// 3. DIALOGUES
// ════════════════════════════════════════════════
const DIALOGS = {

  intro_outside: [
    { speaker:'NICO', portrait:'nico', text:'Byilhan... t\'es sûr de vouloir entrer là-dedans ? Ce fast-food est fermé depuis 2019.' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'T\'inquiète frère ! On cherche juste le TastyCrousty. Il paraît qu\'il y a encore des stocks ici !' },
    { speaker:'NICO', portrait:'nico', text:'Le TastyCrousty... Ce snack a été retiré de la vente pour des "raisons sanitaires non précisées".' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Justement ! Ça veut dire qu\'il est extra. Les trucs interdits sont toujours les meilleurs.' },
    { speaker:'NICO', portrait:'nico', text:'Ta logique m\'inquiète. Mais... okay. On entre. Rapidement.' },
  ],

  act1_dining_enter: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'Woah. C\'est... dark. Mais l\'ambiance c\'est pas mal en fait.' },
    { speaker:'NICO', portrait:'nico', text:'Y\'a des tables renversées. Des taches partout. Ça sent bizarre.' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Ça sent le... vieux crouton ? Nostalgique !' },
    { speaker:'NICO', portrait:'nico', text:'Ça sent quelque chose qui n\'aurait pas dû survivre aussi longtemps.' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Tu dramatises. Cherche la cuisine, y\'a sûrement encore des stocks derrière.' },
  ],

  act1_stain_investigate: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'C\'est quoi cette tache ? Du ketchup ?' },
    { speaker:'NICO', portrait:'nico', text:'Ils ont arrêté le ketchup ici il y a 5 ans...' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'De la sauce tomate alors ?' },
    { speaker:'NICO', portrait:'nico', text:'Byilhan. Ce n\'est pas de la sauce.' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'...Mouais. Avance.' },
  ],

  act1_found_memo: [
    { speaker:'NICO', portrait:'nico', text:'Un mémo... "Ne pas distribuer le lot #666. Ne pas consommer." C\'est quoi ce délire ?' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Lot 666 ? Bro, les gens sont tellement dramatiques avec les superstitions.' },
    { speaker:'NICO', portrait:'nico', text:'Je garde ça. Ça a l\'air important.' },
  ],

  act1_kitchen_enter: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'La cuisine ! Jackpot. Y\'a peut-être des TastyCrousty dans le frigo industriel.' },
    { speaker:'NICO', portrait:'nico', text:'Le frigo tourne encore ? Mais l\'électricité est coupée normalement...' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Ça marche encore sur le générateur de secours sûrement. Viens voir !' },
  ],

  act1_freezer_before: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'Tu ouvres le congélo ou quoi ? Vas-y !' },
    { speaker:'NICO', portrait:'nico', text:'Il y a une lumière rouge qui clignote derrière. C\'est... normal ?' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'C\'est la lampe de maintenance. Open it !' },
  ],

  act2_tension_start: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'...Tu entends ça ?' },
    { speaker:'NICO', portrait:'nico', text:'Quoi ?' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Ce bruit. Comme si quelque chose... mâchait. Dans les murs.' },
    { speaker:'NICO', portrait:'nico', text:'Ce sont les canalisations. Ce vieux bâtiment...' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Nico. Les canalisations ne respirent pas.' },
  ],

  act2_shadow_seen: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'Attends. Attends. TU AS VU ÇA ?' },
    { speaker:'NICO', portrait:'nico', text:'Quoi ? Où ?' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'Dans le couloir. Une ombre. Ronde. Avec... des dents.' },
    { speaker:'NICO', portrait:'nico', text:'Byilhan, calme—' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'JE SUIS CALME ! JE SUIS TRÈS CALME !' },
  ],

  act2_byilhan_panic: [
    { speaker:'BYILHAN', portrait:'byilhan', text:'On part. On part MAINTENANT. J\'ai plus envie de TastyCrousty.' },
    { speaker:'NICO', portrait:'nico', text:'Attends, j\'ai trouvé une note sur un certain "Flamby". Il faut que je comprenne.' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'NICO. Quelque chose me regarde depuis ces ombres.' },
    { speaker:'NICO', portrait:'nico', text:'T\'es parano...' },
    { speaker:'BYILHAN', portrait:'byilhan', text:'JE SUIS PAS PARANO !' },
  ],

  act3_alone_monologue: [
    { speaker:'NICO', portrait:'nico', text:'Byilhan... je suis désolé.' },
    { speaker:'NICO', portrait:'nico', text:'J\'aurais dû écouter. Mais maintenant je dois comprendre.' },
    { speaker:'NICO', portrait:'nico', text:'Pourquoi le TastyCrousty existe. Pourquoi il nous a choisis.' },
    { speaker:'NICO', portrait:'nico', text:'Et ce "Flamby"... Toutes les notes en parlent. Il doit y avoir un moyen.' },
  ],

  act3_found_flamby_note: [
    { speaker:'NICO', portrait:'nico', text:'Flamby. Le Sauveur. "Ventre de fer... immunité totale..." C\'est insensé.' },
    { speaker:'NICO', portrait:'nico', text:'"Laissez juste Flamby manger." C\'est ça ? La solution c\'est de lui faire manger cette chose ?' },
    { speaker:'NICO', portrait:'nico', text:'Il faut que je l\'trouve. Il faut que je l\'trouve avant que le TastyCrousty me trouve.' },
  ],

  act4_flamby_arrives: [
    { speaker:'???', portrait:'flamby', text:'Eh. T\'as l\'air d\'avoir besoin d\'aide, toi.' },
    { speaker:'NICO', portrait:'nico', text:'QUI— qui es-tu ? Comment t\'es entré ici ?' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Par la porte du fond. Elle était ouverte. Je m\'appelle Flamby.' },
    { speaker:'NICO', portrait:'nico', text:'FLAMBY ?! C\'est toi dont parlent toutes les notes ?!' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Probablement. J\'ai une certaine... réputation dans ce milieu.' },
  ],

  act4_flamby_explains: [
    { speaker:'FLAMBY', portrait:'flamby', text:'Le TastyCrousty, c\'est une erreur scientifique. Un snack qui a développé une conscience.' },
    { speaker:'NICO', portrait:'nico', text:'Et... comment tu peux le vaincre en le mangeant ?' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Parce que mon système digestif est une arme de destruction massive. Cliniquement prouvé.' },
    { speaker:'NICO', portrait:'nico', text:'C\'est... ce n\'est pas une réponse normale.' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Frère, la normale s\'est arrêtée quand un crouton a mangé ton ami. Suis-moi.' },
  ],

  act4_prep_ritual: [
    { speaker:'FLAMBY', portrait:'flamby', text:'Pour l\'attirer, il faut recréer les conditions de sa création. Les 3 artefacts dans le cercle.' },
    { speaker:'NICO', portrait:'nico', text:'J\'ai vu ça dans une note. Le fragment de cuve, la formule, le sceau.' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Exactement. Toi tu places les artefacts. Moi je me prépare psychologiquement.' },
    { speaker:'NICO', portrait:'nico', text:'Tu te prépares... comment ?' },
    { speaker:'FLAMBY', portrait:'flamby', text:'J\'ai faim. C\'est mon état optimal.' },
  ],

  final_confrontation: [
    { speaker:'FLAMBY', portrait:'flamby', text:'Recule, Nico. Et quelle que chose arrive... fais confiance au ventre.' },
    { speaker:'NICO', portrait:'nico', text:'Sois... prudent, Flamby.' },
    { speaker:'FLAMBY', portrait:'flamby', text:'La prudence c\'est pour ceux qui ont peur. Moi j\'ai faim.' },
  ],

  after_finale: [
    { speaker:'NICO', portrait:'nico', text:'C\'est... c\'est fini ?' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Hmm. Pas si mal. Un peu trop de sel.' },
    { speaker:'NICO', portrait:'nico', text:'Tu viens de sauver le monde en mangeant un snack démoniaque.' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Pépère.' },
    { speaker:'NICO', portrait:'nico', text:'Byilhan... ça valait son sacrifice ?' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Il a été consommé pour une bonne cause. C\'est beau, d\'une certaine façon.' },
    { speaker:'NICO', portrait:'nico', text:'Je savais pas si je devais pleurer ou rire à ça.' },
    { speaker:'FLAMBY', portrait:'flamby', text:'Les deux. Toujours les deux.' },
  ],
};

// ════════════════════════════════════════════════
// 4. SCÈNES
// ════════════════════════════════════════════════
const SCENES_DEF = {

  fastfood_outside: {
    name: 'Fast-Food Abandonné — Extérieur',
    ambient: 'factory',
    creaks: 'low',
    chapter: 1,
    draw: drawScene_outside,
    hotspots: [
      { id:'hs_door',      x:'43%', y:'32%', w:'12%', h:'22%', label:'Entrer', action:'go_dining' },
      { id:'hs_sign',      x:'25%', y:'8%',  w:'50%', h:'14%', label:'Regarder l\'enseigne', action:'look_sign' },
      { id:'hs_dumpster',  x:'70%', y:'55%', w:'18%', h:'20%', label:'Fouiller la poubelle', action:'search_dumpster' },
    ],
    onEnter: function() {
      if(!G.flags.outside_dialog) {
        G.flags.outside_dialog = true;
        scheduleDialog('intro_outside', 800);
      }
    }
  },

  fastfood_dining: {
    name: 'Salle à Manger — TastyCrousty',
    ambient: 'factory',
    creaks: 'low',
    chapter: 1,
    draw: drawScene_dining,
    hotspots: [
      { id:'hs_counter',   x:'30%', y:'35%', w:'18%', h:'20%', label:'Fouiller le comptoir', action:'search_counter' },
      { id:'hs_menuboard', x:'55%', y:'12%', w:'20%', h:'18%', label:'Lire le menu', action:'read_menu' },
      { id:'hs_stain',     x:'45%', y:'63%', w:'10%', h:'10%', label:'Examiner la tache', action:'stain_inspect' },
      { id:'hs_table',     x:'72%', y:'55%', w:'14%', h:'12%', label:'Fouiller sous la table', action:'search_table' },
      { id:'hs_kitchen_door', x:'5%', y:'35%', w:'10%', h:'30%', label:'Porte cuisine →', action:'go_kitchen', needsItem:'kitchen_key', locked:true },
      { id:'hs_exit',      x:'85%', y:'40%', w:'10%', h:'25%', label:'← Sortir', action:'go_outside' },
    ],
    onEnter: function() {
      if(!G.flags.dining_entered) {
        G.flags.dining_entered = true;
        scheduleDialog('act1_dining_enter', 600);
      }
      if(G.chapter === 2 && !G.flags.act2_tension_shown) {
        G.flags.act2_tension_shown = true;
        scheduleDialog('act2_tension_start', 1200);
      }
    }
  },

  fastfood_kitchen: {
    name: 'Cuisine Industrielle',
    ambient: 'tension',
    creaks: 'low',
    chapter: 1,
    draw: drawScene_kitchen,
    hotspots: [
      { id:'hs_freezer',   x:'60%', y:'20%', w:'22%', h:'52%', label:'Ouvrir le congélateur', action:'open_freezer' },
      { id:'hs_locker',    x:'78%', y:'22%', w:'14%', h:'40%', label:'Casiers employés', action:'search_locker' },
      { id:'hs_storage_door', x:'1%', y:'32%', w:'9%', h:'32%', label:'→ Stockage', action:'go_storage' },
      { id:'hs_back_dining', x:'88%', y:'35%', w:'10%', h:'28%', label:'← Salle', action:'go_dining' },
      { id:'hs_crate',     x:'12%', y:'50%', w:'14%', h:'22%', label:'Fouiller les caisses', action:'search_crate' },
    ],
    onEnter: function() {
      if(!G.flags.kitchen_entered) {
        G.flags.kitchen_entered = true;
        scheduleDialog('act1_kitchen_enter', 500);
      }
    }
  },

  fastfood_storage: {
    name: 'Réserve — Zone Restreinte',
    ambient: 'tension',
    creaks: 'low',
    chapter: 1,
    draw: drawScene_storage,
    hotspots: [
      { id:'hs_boxes',     x:'10%', y:'20%', w:'70%', h:'50%', label:'Examiner les boîtes', action:'examine_boxes' },
      { id:'hs_hidden_door', x:'75%', y:'28%', w:'15%', h:'45%', label:'???', action:'find_hidden', needsFlag:'shelf_moved' },
      { id:'hs_shelf',     x:'75%', y:'28%', w:'15%', h:'45%', label:'Déplacer l\'étagère', action:'move_shelf', hideIfFlag:'shelf_moved' },
      { id:'hs_back_kitchen', x:'1%', y:'35%', w:'8%', h:'30%', label:'← Cuisine', action:'go_kitchen' },
    ],
    onEnter: function() {}
  },

  office: {
    name: 'Bureau du Directeur',
    ambient: 'tension',
    creaks: 'low',
    chapter: 1,
    draw: drawScene_office,
    hotspots: [
      { id:'hs_desk',      x:'30%', y:'30%', w:'28%', h:'38%', label:'Fouiller le bureau', action:'search_desk' },
      { id:'hs_cabinet',   x:'70%', y:'18%', w:'15%', h:'52%', label:'Classeur', action:'search_cabinet' },
      { id:'hs_wall_drawings', x:'0%', y:'5%', w:'25%', h:'50%', label:'Examiner les dessins', action:'view_wall' },
      { id:'hs_back',      x:'82%', y:'60%', w:'14%', h:'20%', label:'← Sortir', action:'go_storage' },
    ],
    onEnter: function() {
      if(G.chapter === 2 && !G.flags.act2_shadow) {
        G.flags.act2_shadow = true;
        scheduleDialog('act2_shadow_seen', 2000);
      }
    }
  },

  basement: {
    name: 'Sous-Sol — Laboratoire',
    ambient: 'horror',
    creaks: 'high',
    chapter: 2,
    draw: drawScene_basement,
    hotspots: [
      { id:'hs_journal',   x:'55%', y:'45%', w:'12%', h:'18%', label:'Journal Grunholt', action:'read_journal' },
      { id:'hs_jars',      x:'20%', y:'20%', w:'25%', h:'45%', label:'Bocaux de spécimens', action:'examine_jars' },
      { id:'hs_lab_door',  x:'70%', y:'28%', w:'14%', h:'38%', label:'Porte du labo →', action:'open_lab_door', needsPuzzle:'code_puzzle', locked:true },
      { id:'hs_back_storage', x:'1%', y:'35%', w:'8%', h:'30%', label:'← Remontée', action:'go_storage' },
    ],
    onEnter: function() {
      if(!G.flags.basement_entered) {
        G.flags.basement_entered = true;
        if(G.chapter < 2) advanceChapter(2);
        scheduleDialog('act3_alone_monologue', 1000);
      }
    }
  },

  lab_main: {
    name: 'Laboratoire Principal — Zone X',
    ambient: 'horror',
    creaks: 'high',
    chapter: 3,
    draw: drawScene_lab,
    hotspots: [
      { id:'hs_whiteboard', x:'58%', y:'8%', w:'28%', h:'45%', label:'Tableau blanc', action:'read_whiteboard' },
      { id:'hs_ritual_circle', x:'30%', y:'55%', w:'20%', h:'28%', label:'Cercle au sol', action:'examine_circle' },
      { id:'hs_ritual_puzzle', x:'30%', y:'55%', w:'20%', h:'28%', label:'Placer les artefacts', action:'placement_puzzle', needsFlag:'found_flamby_note', needsItems:['fragment_cuve','formule_x77','sceau_tc'] },
      { id:'hs_chamber_door', x:'1%', y:'25%', w:'10%', h:'50%', label:'→ Chambre Rituelle', action:'go_chamber', needsFlag:'ritual_complete' },
      { id:'hs_back_basement', x:'85%', y:'38%', w:'12%', h:'28%', label:'← Sous-sol', action:'go_basement' },
    ],
    onEnter: function() {
      if(G.chapter < 3) advanceChapter(3);
    }
  },

  ritual_chamber: {
    name: 'Chambre Rituelle — Niveau -3',
    ambient: 'horror',
    creaks: 'high',
    chapter: 4,
    draw: drawScene_chamber,
    hotspots: [
      { id:'hs_altar',     x:'35%', y:'28%', w:'30%', h:'40%', label:'Examiner l\'autel', action:'examine_altar' },
      { id:'hs_summon',    x:'35%', y:'28%', w:'30%', h:'40%', label:'Invoquer le Sauveur', action:'summon_flamby', needsFlag:'ritual_complete' },
      { id:'hs_back_lab',  x:'85%', y:'38%', w:'12%', h:'26%', label:'← Labo', action:'go_lab' },
    ],
    onEnter: function() {
      if(G.chapter < 4) advanceChapter(4);
      if(!G.flags.chamber_entered) {
        G.flags.chamber_entered = true;
      }
    }
  },
};

// ════════════════════════════════════════════════
// 5. DESSIN DES SCÈNES (Canvas 2D)
// ════════════════════════════════════════════════

function drawPerspectiveRoom(ctx, w, h, opts={}) {
  const { ceilColor='#080305', floorColor='#0a0405', wallColor='#0d0608', vanishX=0.5, floorDetail=true } = opts;
  const cx = w*vanishX, cy = h*0.42;

  // Ceiling
  const cg = ctx.createLinearGradient(0,0,0,cy);
  cg.addColorStop(0, ceilColor);
  cg.addColorStop(1, wallColor);
  ctx.fillStyle = cg;
  ctx.fillRect(0,0,w,cy);

  // Floor
  const fg = ctx.createLinearGradient(0,cy,0,h);
  fg.addColorStop(0, floorColor);
  fg.addColorStop(1, '#050203');
  ctx.fillStyle = fg;
  ctx.fillRect(0,cy,w,h-cy);

  // Perspective lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for(let i=0;i<=10;i++) {
    const fx = (i/10)*w;
    ctx.beginPath();
    ctx.moveTo(fx, h);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }

  // Floor tiles
  if(floorDetail) {
    ctx.strokeStyle = 'rgba(100,50,50,0.08)';
    for(let row=1;row<8;row++){
      const ty = cy + (h-cy)*row/8;
      ctx.beginPath();
      ctx.moveTo(0,ty);
      ctx.lineTo(w,ty);
      ctx.stroke();
    }
    for(let col=0;col<12;col++){
      const tx = col/12*w;
      ctx.beginPath();
      ctx.moveTo(tx,h);
      const vx = cx + (tx-cx)*(cy-h)/(h-cy)*-1;
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }
  }
}

function drawVignette(ctx, w, h, intensity=0.7) {
  const grd = ctx.createRadialGradient(w/2,h/2,h*0.1, w/2,h/2,h*0.8);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,w,h);
}

function drawScene_outside(ctx, w, h) {
  // Night sky
  const sky = ctx.createLinearGradient(0,0,0,h*0.55);
  sky.addColorStop(0,'#010006');
  sky.addColorStop(1,'#0a0308');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,w,h*0.55);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const starSeed = [0.1,0.3,0.8,0.15,0.6,0.9,0.4,0.05,0.7,0.55,0.22,0.88,0.33,0.77,0.12,0.66,0.44,0.95];
  starSeed.forEach((s,i)=>{
    const sx = s*w, sy = ((i*0.137)%1)*h*0.4;
    const sr = 0.5+Math.random()*1;
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
  });

  // Ground
  const grd = ctx.createLinearGradient(0,h*0.55,0,h);
  grd.addColorStop(0,'#0a0507'); grd.addColorStop(1,'#050203');
  ctx.fillStyle = grd;
  ctx.fillRect(0,h*0.55,w,h*0.45);

  // Building facade
  ctx.fillStyle = '#0e0810';
  ctx.fillRect(w*0.12, h*0.12, w*0.76, h*0.5);

  // Windows (broken, dark)
  [[0.18,0.17,0.1,0.12],[0.72,0.17,0.1,0.12],[0.18,0.35,0.1,0.1],[0.72,0.35,0.1,0.1]].forEach(([x,y,ww,hh])=>{
    ctx.fillStyle = '#0a0208';
    ctx.fillRect(w*x, h*y, w*ww, h*hh);
    ctx.strokeStyle = 'rgba(80,20,30,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w*x, h*y, w*ww, h*hh);
    // crack
    ctx.strokeStyle = 'rgba(60,0,10,0.6)'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(w*(x+ww*0.4), h*y);
    ctx.lineTo(w*(x+ww*0.6), h*(y+hh));
    ctx.stroke();
  });

  // Door
  ctx.fillStyle = '#080408';
  ctx.fillRect(w*0.43, h*0.3, w*0.14, h*0.32);
  ctx.strokeStyle = 'rgba(120,40,40,0.5)';
  ctx.lineWidth=2;
  ctx.strokeRect(w*0.43, h*0.3, w*0.14, h*0.32);
  // Door handle
  ctx.fillStyle = '#3a1a1a';
  ctx.beginPath(); ctx.arc(w*0.455, h*0.465, 5, 0, Math.PI*2); ctx.fill();

  // Sign
  ctx.fillStyle = '#1a0a00';
  ctx.fillRect(w*0.24, h*0.07, w*0.52, h*0.1);
  // Sign glow
  const sglow = ctx.createLinearGradient(w*0.24, 0, w*0.76, 0);
  sglow.addColorStop(0,'rgba(180,80,0,0)');
  sglow.addColorStop(0.3,'rgba(220,120,0,0.2)');
  sglow.addColorStop(0.7,'rgba(220,120,0,0.2)');
  sglow.addColorStop(1,'rgba(180,80,0,0)');
  ctx.fillStyle = sglow;
  ctx.fillRect(w*0.24, h*0.07, w*0.52, h*0.1);

  ctx.fillStyle = '#cc6600';
  ctx.font = `bold ${h*0.055}px 'Creepster', cursive`;
  ctx.textAlign = 'center';
  ctx.fillText('TASTY  CROUSTY', w*0.5, h*0.14);

  // Dumpster
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(w*0.71, h*0.55, w*0.15, h*0.18);
  ctx.fillStyle = '#252525';
  ctx.fillRect(w*0.71, h*0.53, w*0.15, h*0.04);

  // Pavement cracks
  ctx.strokeStyle = 'rgba(255,200,150,0.05)';
  ctx.lineWidth=1;
  [[0.1,0.7,0.3,0.8],[0.5,0.9,0.7,0.75],[0.2,0.85,0.45,0.9]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(w*x1,h*y1); ctx.lineTo(w*x2,h*y2); ctx.stroke();
  });

  drawVignette(ctx, w, h, 0.8);
}

function drawScene_dining(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#070205', floorColor:'#0c0507', wallColor:'#0f0608'});

  // Menu boards on back wall
  ctx.fillStyle = '#1a0c0e';
  ctx.fillRect(w*0.35, h*0.04, w*0.3, h*0.25);
  ctx.strokeStyle = 'rgba(180,80,0,0.3)';
  ctx.lineWidth=2; ctx.strokeRect(w*0.35, h*0.04, w*0.3, h*0.25);
  ctx.fillStyle = 'rgba(100,50,10,0.4)';
  ctx.font = `${h*0.024}px 'Creepster'`;
  ctx.textAlign='center';
  ctx.fillText('MENU', w*0.5, h*0.13);
  ['TastyCrousty Original', 'TastyCrousty Noir', 'ÉDITION SPÉCIALE 666'].forEach((t,i)=>{
    ctx.fillStyle = i===2 ? 'rgba(180,20,20,0.6)' : 'rgba(120,80,50,0.4)';
    ctx.font = `${h*0.016}px 'Special Elite'`;
    ctx.fillText(t, w*0.5, h*(0.16+i*0.04));
  });

  // Counter
  ctx.fillStyle = '#160a0c';
  ctx.fillRect(w*0.22, h*0.35, w*0.25, h*0.3);
  ctx.fillStyle = '#1e0e10';
  ctx.fillRect(w*0.22, h*0.33, w*0.25, h*0.04);

  // Overturned tables
  [[0.6,0.52,0.16,0.1], [0.68,0.68,0.18,0.08]].forEach(([x,y,ww,hh])=>{
    ctx.save();
    ctx.translate(w*(x+ww/2), h*(y+hh/2));
    ctx.rotate(Math.random()*0.3-0.15);
    ctx.fillStyle = '#1a0a0c';
    ctx.fillRect(-w*ww/2, -h*hh/2, w*ww, h*hh);
    ctx.restore();
  });

  // Stain on floor
  const stain = ctx.createRadialGradient(w*0.5, h*0.68, 0, w*0.5, h*0.68, w*0.07);
  stain.addColorStop(0,'rgba(80,5,5,0.6)');
  stain.addColorStop(1,'rgba(40,0,0,0)');
  ctx.fillStyle = stain;
  ctx.beginPath(); ctx.ellipse(w*0.5, h*0.68, w*0.07, h*0.04, 0, 0, Math.PI*2); ctx.fill();

  // Broken window — moonlight
  ctx.fillStyle = 'rgba(15,15,40,0.3)';
  ctx.fillRect(w*0.75, h*0.15, w*0.12, h*0.2);
  const moonlight = ctx.createLinearGradient(w*0.75, h*0.15, w*0.75, h*0.6);
  moonlight.addColorStop(0,'rgba(30,30,80,0.15)');
  moonlight.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = moonlight;
  ctx.beginPath();
  ctx.moveTo(w*0.75, h*0.15); ctx.lineTo(w*0.87, h*0.15);
  ctx.lineTo(w*0.95, h); ctx.lineTo(w*0.6, h);
  ctx.fill();

  // Kitchen door (left)
  ctx.fillStyle = G.inventory.includes('kitchen_key') ? '#1a1030' : '#100808';
  ctx.fillRect(w*0.04, h*0.28, w*0.09, h*0.38);
  ctx.strokeStyle = 'rgba(100,60,20,0.4)'; ctx.lineWidth=2;
  ctx.strokeRect(w*0.04, h*0.28, w*0.09, h*0.38);
  if(!G.flags.kitchen_unlocked) {
    ctx.fillStyle = '#4a2010';
    ctx.beginPath(); ctx.arc(w*0.12, h*0.47, 4, 0, Math.PI*2); ctx.fill();
  }

  drawVignette(ctx, w, h, 0.75);
}

function drawScene_kitchen(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#060304', floorColor:'#0a0607', wallColor:'#0e0709'});

  // Industrial ceiling ducts
  ctx.fillStyle = '#1a1010';
  [[0.1,0,0.15,0.08],[0.4,0,0.2,0.06],[0.7,0,0.15,0.07]].forEach(([x,y,ww,hh])=>{
    ctx.fillRect(w*x, h*y, w*ww, h*hh);
    ctx.strokeStyle='rgba(100,60,50,0.2)'; ctx.lineWidth=1;
    ctx.strokeRect(w*x, h*y, w*ww, h*hh);
  });

  // Freezer (right side)
  ctx.fillStyle = '#0d1a20';
  ctx.fillRect(w*0.6, h*0.08, w*0.22, h*0.68);
  ctx.strokeStyle = G.flags.freezer_opened ? 'rgba(0,100,150,0.4)' : 'rgba(60,100,120,0.3)';
  ctx.lineWidth=3; ctx.strokeRect(w*0.6, h*0.08, w*0.22, h*0.68);
  // Frost effect
  ctx.fillStyle = 'rgba(150,220,255,0.04)';
  ctx.fillRect(w*0.6, h*0.08, w*0.22, h*0.68);
  // Red warning light on freezer
  const flicker = Math.sin(Date.now()*0.005)>0.6;
  ctx.fillStyle = flicker ? '#ff0000' : '#660000';
  ctx.beginPath(); ctx.arc(w*0.7, h*0.12, 6, 0, Math.PI*2); ctx.fill();
  if(flicker){
    ctx.fillStyle='rgba(255,0,0,0.15)';
    ctx.beginPath(); ctx.arc(w*0.7, h*0.12, 20, 0, Math.PI*2); ctx.fill();
  }

  // Lockers (right far)
  ctx.fillStyle = '#111518';
  ctx.fillRect(w*0.79, h*0.12, w*0.12, h*0.56);
  ['#181c1f','#141820'].forEach((c,i)=>{
    ctx.fillStyle=c;
    ctx.fillRect(w*(0.795+i*0.055), h*0.14, w*0.048, h*0.5);
  });

  // Prep tables
  ctx.fillStyle = '#1c1010';
  ctx.fillRect(w*0.08, h*0.48, w*0.45, h*0.12);
  ctx.fillStyle='#150e0e';
  ctx.fillRect(w*0.08, h*0.45, w*0.45, h*0.04);

  // Crates left
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(w*0.08, h*0.55, w*0.16, h*0.2);
  ctx.fillRect(w*0.1, h*0.48, w*0.12, h*0.08);

  // Wall graffiti / writing
  ctx.fillStyle = 'rgba(120,20,20,0.25)';
  ctx.font = `${h*0.018}px 'Special Elite'`;
  ctx.textAlign='left';
  ctx.fillText('NE PAS OUVRIR', w*0.15, h*0.2);

  // Storage door
  ctx.fillStyle = '#100a08';
  ctx.fillRect(w*0.0, h*0.28, w*0.08, h*0.38);
  ctx.strokeStyle='rgba(80,40,20,0.4)'; ctx.lineWidth=2;
  ctx.strokeRect(w*0.0, h*0.28, w*0.08, h*0.38);

  drawVignette(ctx, w, h, 0.8);
}

function drawScene_storage(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#050203', floorColor:'#080405', wallColor:'#0b0507'});

  // Tall shelving units
  const shelfColors = ['#120810','#0e070c','#100810'];
  for(let col=0;col<3;col++){
    const sx = w*(0.1+col*0.23);
    ctx.fillStyle = shelfColors[col];
    ctx.fillRect(sx, h*0.1, w*0.18, h*0.72);
    // Shelves
    for(let row=0;row<4;row++){
      ctx.fillStyle='rgba(255,200,150,0.06)';
      ctx.fillRect(sx, h*(0.1+row*0.18), w*0.18, h*0.02);
      // Boxes on shelves
      for(let box=0;box<3;box++){
        ctx.fillStyle=`hsl(${25+Math.sin(col*row*box)*15},${30+col*5}%,${8+row*2}%)`;
        ctx.fillRect(sx+w*(0.01+box*0.055), h*(0.13+row*0.18), w*0.05, h*0.1);
        // TC logo on box
        ctx.fillStyle='rgba(200,100,0,0.3)';
        ctx.font=`${h*0.012}px 'Creepster'`;
        ctx.textAlign='center';
        ctx.fillText('TC', sx+w*(0.035+box*0.055), h*(0.18+row*0.18));
      }
    }
  }

  // Special boxes right side — lot 666
  ctx.fillStyle = '#200810';
  ctx.fillRect(w*0.76, h*0.25, w*0.14, h*0.5);
  ctx.strokeStyle='rgba(200,20,20,0.4)'; ctx.lineWidth=2;
  ctx.strokeRect(w*0.76, h*0.25, w*0.14, h*0.5);
  ctx.fillStyle='rgba(180,0,0,0.5)';
  ctx.font=`${h*0.016}px 'Creepster'`; ctx.textAlign='center';
  ctx.fillText('LOT', w*0.83, h*0.42);
  ctx.fillText('#666', w*0.83, h*0.5);
  ctx.fillText('⚠ DANGER', w*0.83, h*0.58);

  // Hidden passage glow (if shelf not moved)
  if(!G.flags.shelf_moved) {
    ctx.fillStyle='rgba(100,0,0,0.05)';
    ctx.fillRect(w*0.76, h*0.25, w*0.14, h*0.5);
  } else {
    // Reveal dark opening
    ctx.fillStyle='#000000';
    ctx.fillRect(w*0.76, h*0.25, w*0.14, h*0.5);
    ctx.fillStyle='rgba(100,0,30,0.2)';
    ctx.beginPath();
    ctx.ellipse(w*0.83, h*0.5, w*0.08, h*0.25, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle='rgba(80,0,20,0.3)';
    ctx.font=`${h*0.02}px 'Creepster'`; ctx.textAlign='center';
    ctx.fillText('↓ SOUS-SOL', w*0.83, h*0.5);
  }

  drawVignette(ctx, w, h, 0.85);
}

function drawScene_office(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#060205', floorColor:'#080305', wallColor:'#0c0408'});

  // Creepy wall drawings (left)
  ctx.strokeStyle='rgba(100,10,10,0.4)'; ctx.lineWidth=1.5;
  // Eyes drawn crazily
  for(let i=0;i<8;i++){
    const ex=w*(0.02+Math.sin(i*1.7)*0.1), ey=h*(0.1+i*0.08);
    ctx.beginPath();
    ctx.ellipse(ex+w*0.05, ey, w*0.04, h*0.025, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle='rgba(120,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(ex+w*0.05, ey, w*0.015, h*0.012, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle='rgba(120,20,20,0.35)';
  ctx.font=`${h*0.016}px 'Special Elite'`; ctx.textAlign='left';
  ctx.fillText('IL REVIENT', w*0.01, h*0.78);
  ctx.fillText('IL EST DANS', w*0.01, h*0.82);
  ctx.fillText('LES MURS', w*0.02, h*0.86);

  // Desk
  ctx.fillStyle = '#1a0d10';
  ctx.fillRect(w*0.28, h*0.35, w*0.32, h*0.28);
  ctx.fillStyle='#1e1012';
  ctx.fillRect(w*0.28, h*0.33, w*0.32, h*0.04);
  // Papers on desk
  [[0.3,0.37,0.08,0.1],[0.34,0.4,0.07,0.09],[0.4,0.36,0.1,0.08]].forEach(([x,y,ww,hh])=>{
    ctx.fillStyle='#c8bc9a';
    ctx.save(); ctx.translate(w*(x+ww/2),h*(y+hh/2));
    ctx.rotate((Math.random()-.5)*.3); ctx.fillRect(-w*ww/2,-h*hh/2,w*ww,h*hh); ctx.restore();
  });

  // Computer (off, cracked screen)
  ctx.fillStyle = '#111518';
  ctx.fillRect(w*0.33, h*0.22, w*0.12, h*0.12);
  ctx.fillStyle='#0a0d10'; ctx.fillRect(w*0.335, h*0.225, w*0.11, h*0.1);
  // Crack on screen
  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(w*0.36,h*0.225); ctx.lineTo(w*0.38,h*0.32); ctx.stroke();

  // Filing cabinet
  ctx.fillStyle='#131215';
  ctx.fillRect(w*0.68, h*0.12, w*0.14, h*0.58);
  for(let d=0;d<3;d++){
    ctx.fillStyle='rgba(60,30,40,0.4)';
    ctx.fillRect(w*0.69, h*(0.14+d*0.17), w*0.12, h*0.14);
    ctx.fillStyle='#2a1820';
    ctx.beginPath(); ctx.arc(w*0.75, h*(0.21+d*0.17), 4, 0, Math.PI*2); ctx.fill();
  }

  drawVignette(ctx, w, h, 0.8);
}

function drawScene_basement(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#040102', floorColor:'#060204', wallColor:'#090306', floorDetail:false});

  // Red emergency lighting strips
  const redBeat = 0.3+Math.sin(Date.now()*.002)*.1;
  ctx.fillStyle=`rgba(180,0,0,${redBeat})`;
  ctx.fillRect(0,0,w,h*0.04);
  ctx.fillRect(0,h*0.96,w,h*0.04);

  // Specimen jars
  const jarPositions = [[0.08,0.2],[0.15,0.18],[0.22,0.22],[0.08,0.44],[0.17,0.4]];
  jarPositions.forEach(([x,y])=>{
    // Jar
    ctx.fillStyle='rgba(0,30,40,0.6)';
    ctx.strokeStyle='rgba(0,80,100,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.ellipse(w*x, h*(y+0.1), w*0.04, h*0.12, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    // Liquid
    const jg = ctx.createRadialGradient(w*x,h*(y+0.1),0,w*x,h*(y+0.1),w*0.035);
    jg.addColorStop(0,'rgba(0,120,80,0.3)');
    jg.addColorStop(1,'rgba(0,60,40,0.1)');
    ctx.fillStyle=jg;
    ctx.beginPath();
    ctx.ellipse(w*x, h*(y+0.1), w*0.035, h*0.1, 0, 0, Math.PI*2);
    ctx.fill();
    // Mini TC inside
    ctx.fillStyle='rgba(180,80,0,0.4)';
    ctx.beginPath(); ctx.arc(w*x, h*(y+0.1), 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,0,0,0.6)';
    ctx.beginPath(); ctx.arc(w*(x-0.005), h*(y+0.08), 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*(x+0.005), h*(y+0.08), 2, 0, Math.PI*2); ctx.fill();
  });

  // Lab bench
  ctx.fillStyle='#0e0810';
  ctx.fillRect(w*0.05, h*0.55, w*0.45, h*0.15);
  // Journal on bench
  ctx.fillStyle='#8a7a60'; ctx.save();
  ctx.translate(w*0.58, h*0.52); ctx.rotate(-.05);
  ctx.fillRect(-w*0.05, -h*0.07, w*0.1, h*0.14); ctx.restore();
  ctx.fillStyle='rgba(50,30,10,0.5)';
  ctx.font=`${h*0.015}px 'IM Fell English'`; ctx.textAlign='center';
  ctx.fillText('JOURNAL', w*0.58, h*0.52);

  // Lab door (right)
  ctx.fillStyle = G.flags.lab_unlocked ? '#0a0f18' : '#100808';
  ctx.fillRect(w*0.72, h*0.22, w*0.14, h*0.45);
  ctx.strokeStyle = G.flags.lab_unlocked ? 'rgba(40,80,120,0.5)' : 'rgba(100,40,40,0.4)';
  ctx.lineWidth=3; ctx.strokeRect(w*0.72, h*0.22, w*0.14, h*0.45);
  if(!G.flags.lab_unlocked) {
    ctx.fillStyle='#cc3300';
    ctx.font=`${h*0.018}px 'Oswald'`; ctx.textAlign='center';
    ctx.fillText('🔒 CODE REQUIS', w*0.79, h*0.48);
  } else {
    ctx.fillStyle='rgba(0,100,200,0.3)';
    ctx.font=`${h*0.018}px 'Oswald'`; ctx.textAlign='center';
    ctx.fillText('→ LABO', w*0.79, h*0.48);
  }

  // Ceiling pipes
  ctx.strokeStyle='rgba(40,30,30,0.6)'; ctx.lineWidth=8;
  for(let p=0;p<5;p++){
    ctx.beginPath(); ctx.moveTo(w*(0.1+p*0.2),0); ctx.lineTo(w*(0.1+p*0.2),h*0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,h*0.08); ctx.lineTo(w,h*0.08); ctx.stroke();
  }

  // Creepy writing on floor
  ctx.fillStyle='rgba(120,0,0,0.2)';
  ctx.font=`${h*0.018}px 'Special Elite'`; ctx.textAlign='center';
  ctx.fillText('TROUVEZ FLAMBY', w*0.5, h*0.88);

  drawVignette(ctx, w, h, 0.9);
}

function drawScene_lab(ctx, w, h) {
  drawPerspectiveRoom(ctx, w, h, {ceilColor:'#020105', floorColor:'#040208', wallColor:'#060310', floorDetail:false});

  // Blue-purple ambient
  const blueGlow = ctx.createRadialGradient(w*0.5,h*0.3,0,w*0.5,h*0.3,w*0.5);
  blueGlow.addColorStop(0,'rgba(20,10,60,0.3)');
  blueGlow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=blueGlow; ctx.fillRect(0,0,w,h);

  // Whiteboard
  ctx.fillStyle='#c0ccc8';
  ctx.fillRect(w*0.58, h*0.06, w*0.28, h*0.38);
  ctx.strokeStyle='rgba(150,180,200,0.4)'; ctx.lineWidth=3;
  ctx.strokeRect(w*0.58, h*0.06, w*0.28, h*0.38);
  // Writing on whiteboard
  ctx.fillStyle='rgba(30,10,60,0.6)';
  ctx.font=`${h*0.018}px 'Special Elite'`;
  ctx.textAlign='left';
  ['Sujet F (FLAMBY) :', '> Ventre de Fer confirmé', '> Immunité X-77 : 100%', '> Solution finale : MANGER', 'Protocole Sauveur ACTIF'].forEach((t,i)=>{
    ctx.fillText(t, w*0.6, h*(0.12+i*0.055));
  });

  // Ritual circle on floor
  const ritualAlpha = G.flags.ritual_complete ? 0.6 : 0.25;
  ctx.strokeStyle=`rgba(220,80,0,${ritualAlpha})`; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(w*0.38, h*0.72, h*0.12, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w*0.38, h*0.72, h*0.07, 0, Math.PI*2); ctx.stroke();
  // Pentagon inside circle
  for(let i=0;i<5;i++){
    const a1=(i/5)*Math.PI*2-Math.PI/2, a2=((i+1)/5)*Math.PI*2-Math.PI/2;
    ctx.beginPath();
    ctx.moveTo(w*0.38+Math.cos(a1)*h*0.1, h*0.72+Math.sin(a1)*h*0.1);
    ctx.lineTo(w*0.38+Math.cos(a2)*h*0.1, h*0.72+Math.sin(a2)*h*0.1);
    ctx.stroke();
  }
  if(G.flags.ritual_complete) {
    const rGlow = ctx.createRadialGradient(w*0.38,h*0.72,0,w*0.38,h*0.72,h*0.12);
    rGlow.addColorStop(0,'rgba(220,100,0,0.3)'); rGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rGlow; ctx.fillRect(0,0,w,h);
  }

  // Research equipment
  ctx.fillStyle='#0a0810';
  ctx.fillRect(w*0.05, h*0.4, w*0.3, h*0.2);
  // Tubes and beakers
  for(let t=0;t<5;t++){
    ctx.fillStyle=`rgba(${20+t*10},0,${80-t*10},0.5)`;
    ctx.fillRect(w*(0.07+t*0.05), h*0.3, w*0.015, h*0.12);
  }

  // Chamber door
  const chamberOpen = G.flags.ritual_complete;
  ctx.fillStyle = chamberOpen ? '#05020a' : '#080508';
  ctx.fillRect(w*0.0, h*0.2, w*0.09, h*0.55);
  ctx.strokeStyle = chamberOpen ? 'rgba(150,80,200,0.5)' : 'rgba(60,30,80,0.3)';
  ctx.lineWidth=3; ctx.strokeRect(w*0.0, h*0.2, w*0.09, h*0.55);

  drawVignette(ctx, w, h, 0.88);
}

function drawScene_chamber(ctx, w, h) {
  // Ancient stone look
  const bg = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,h*0.8);
  bg.addColorStop(0,'#0a0515'); bg.addColorStop(1,'#000000');
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);

  // Stone texture approximation
  ctx.strokeStyle='rgba(40,20,40,0.2)'; ctx.lineWidth=1;
  for(let y=0;y<h;y+=h*0.06) for(let x=0;x<w;x+=w*0.1){
    ctx.strokeRect(x+(y%2>0?w*0.05:0), y, w*0.1, h*0.06);
  }

  // Altar/pedestal
  ctx.fillStyle='#1a0d20';
  ctx.fillRect(w*0.35, h*0.28, w*0.3, h*0.42);
  ctx.fillStyle='#230f2a';
  ctx.fillRect(w*0.32, h*0.26, w*0.36, h*0.06);
  // Glowing runes on altar
  const runeAlpha = 0.3 + Math.sin(Date.now()*.002)*.15;
  ctx.fillStyle=`rgba(180,60,200,${runeAlpha})`;
  ctx.font=`${h*0.04}px 'Creepster'`; ctx.textAlign='center';
  ctx.fillText('⚡ ☠ ⚡', w*0.5, h*0.48);
  ctx.font=`${h*0.022}px 'Special Elite'`;
  ctx.fillStyle=`rgba(150,50,180,${runeAlpha})`;
  ctx.fillText('INVOQUER LE SAUVEUR', w*0.5, h*0.56);

  // Candles
  const candlePositions = [[0.2,0.6],[0.8,0.6],[0.12,0.4],[0.88,0.4],[0.5,0.82]];
  candlePositions.forEach(([x,y])=>{
    // Candle body
    ctx.fillStyle='#c8b87a';
    ctx.fillRect(w*x-4, h*y, 8, h*0.08);
    // Flame
    const fa = Math.sin(Date.now()*.01+x*10)*.3;
    ctx.fillStyle=`rgba(255,180,0,${0.8+fa*0.2})`;
    ctx.beginPath();
    ctx.ellipse(w*x, h*y, 5, 10, fa, 0, Math.PI*2);
    ctx.fill();
    // Glow
    const cg = ctx.createRadialGradient(w*x,h*y,0,w*x,h*y,w*0.06);
    cg.addColorStop(0,`rgba(255,150,0,${0.12+fa*0.05})`);
    cg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cg; ctx.fillRect(0,0,w,h);
  });

  // Artefacts placed in ritual
  if(G.flags.ritual_complete) {
    ['🪨','📜','🔖'].forEach((emoji,i)=>{
      ctx.font=`${h*0.035}px serif`; ctx.textAlign='center';
      ctx.fillText(emoji, w*(0.4+i*0.1), h*0.38);
    });
    const aura = ctx.createRadialGradient(w*0.5,h*0.68,0,w*0.5,h*0.68,w*0.35);
    aura.addColorStop(0,`rgba(100,0,180,0.2)`);
    aura.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=aura; ctx.fillRect(0,0,w,h);
  }

  // Back to lab door
  ctx.fillStyle='#080508';
  ctx.fillRect(w*0.85, h*0.3, w*0.12, h*0.4);
  ctx.strokeStyle='rgba(80,40,100,0.3)'; ctx.lineWidth=2;
  ctx.strokeRect(w*0.85, h*0.3, w*0.12, h*0.4);

  drawVignette(ctx, w, h, 0.92);
}

// ════════════════════════════════════════════════
// 6. MOTEUR DU JEU
// ════════════════════════════════════════════════

function init() {
  G.sceneCanvas  = document.getElementById('scene-canvas');
  G.sceneCtx     = G.sceneCanvas.getContext('2d');
  G.menuCanvas   = document.getElementById('menu-bg-canvas');
  G.menuCtx      = G.menuCanvas.getContext('2d');
  G.screamerCanvas = document.getElementById('screamer-canvas');
  G.screamerCtx  = G.screamerCanvas.getContext('2d');

  resizeAll();
  window.addEventListener('resize', resizeAll);

  // Menu button wiring
  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-continue').addEventListener('click', loadGame);
  document.getElementById('btn-options').addEventListener('click', showOptions);
  document.getElementById('btn-quit').addEventListener('click', ()=>window.location.reload());
  document.getElementById('btn-back-options').addEventListener('click', showMenu);

  // Options
  const volSlider = document.getElementById('volume-slider');
  const briSlider = document.getElementById('bright-slider');
  volSlider.addEventListener('input', ()=>{ G.options.volume=volSlider.value/100; Audio.setVolume(G.options.volume); document.getElementById('volume-val').textContent=volSlider.value+'%'; });
  briSlider.addEventListener('input', ()=>{ G.options.brightness=briSlider.value/100; document.getElementById('bright-val').textContent=briSlider.value+'%'; document.getElementById('vignette-overlay').style.opacity=1.2-G.options.brightness; });

  // Dialog advance
  document.getElementById('dialog-advance').addEventListener('click', advanceDialog);

  // Note close
  document.getElementById('note-close-btn').addEventListener('click', closeNote);

  // Puzzle cancel
  document.getElementById('puzzle-cancel').addEventListener('click', closePuzzle);

  // Pause
  document.getElementById('pause-btn').addEventListener('click', togglePause);
  document.getElementById('pause-resume').addEventListener('click', togglePause);
  document.getElementById('pause-save').addEventListener('click', ()=>{ saveGame(); showFeedback('Partie sauvegardée !'); });
  document.getElementById('pause-main-menu').addEventListener('click', ()=>{ hidePause(); showMenu(); });

  // Cinematic skip
  document.getElementById('cinematic-skip-btn').addEventListener('click', ()=>{
    Cinematic.play('__skip__', ()=>{});
  });

  // Epilogue
  document.getElementById('epilogue-advance').addEventListener('click', startCredits);

  // Credits back
  document.getElementById('credits-back').addEventListener('click', ()=>{ showScreen('main-menu'); showMenu(); });

  // Keyboard
  document.addEventListener('keydown', onKeyDown);

  // Check save
  if(localStorage.getItem('tc_save')) {
    document.getElementById('btn-continue').disabled = false;
  }

  // Init audio silently
  Audio.init();

  // Start loading sequence
  simulateLoading(()=>{
    hideScreen('loading-screen');
    showMenu();
  });
}

function resizeAll() {
  [G.sceneCanvas, G.menuCanvas, G.screamerCanvas].forEach(c=>{
    if(c){ c.width=window.innerWidth; c.height=window.innerHeight; }
  });
}

// ── LOADING ─────────────────────────────────
function simulateLoading(done) {
  const bar = document.getElementById('loading-bar');
  const txt = document.getElementById('loading-text');
  const steps = [
    [15,  'Chargement des textures...'],
    [30,  'Initialisation du moteur...'],
    [48,  'Chargement des scènes...'],
    [65,  'Préparation des dialogues...'],
    [80,  'Calibrage des détecteurs de snack...'],
    [92,  'Invocation des entités...'],
    [100, 'Prêt.'],
  ];
  let idx=0;
  function step(){
    if(idx>=steps.length){ setTimeout(done, 500); return; }
    const [pct,msg] = steps[idx++];
    bar.style.width=pct+'%';
    txt.textContent=msg;
    setTimeout(step, 300+Math.random()*400);
  }
  step();
}

// ── MENU ────────────────────────────────────
function showMenu() {
  showScreen('main-menu');
  Audio.init();
  Audio.playAmbient('factory');
  Audio.startRandomCreaks('low');
  animateMenuBg();
}

let menuAnimId=null;
function animateMenuBg(){
  if(menuAnimId) cancelAnimationFrame(menuAnimId);
  const ctx = G.menuCtx;
  const w = G.menuCanvas.width, h = G.menuCanvas.height;
  let t=0;
  function frame(){
    menuAnimId=requestAnimationFrame(frame);
    t+=0.005;
    ctx.fillStyle='rgba(0,0,0,0.04)';
    ctx.fillRect(0,0,w,h);
    // Drifting particles
    for(let i=0;i<3;i++){
      const x=((Math.sin(t*0.3+i*2.1)*0.5+0.5)+t*0.05)%1 * w;
      const y=((Math.cos(t*0.2+i*1.7)*0.5+0.5)) * h;
      ctx.fillStyle=`rgba(${120+Math.sin(t+i)*40},0,0,0.06)`;
      ctx.beginPath(); ctx.arc(x,y,80+Math.sin(t*2+i)*30,0,Math.PI*2); ctx.fill();
    }
    // Floating crouton symbols
    if(Math.random()<0.002) {
      ctx.fillStyle='rgba(180,80,0,0.04)';
      ctx.font=`${20+Math.random()*30}px Creepster`;
      ctx.textAlign='center';
      ctx.fillText('🍞', Math.random()*w, Math.random()*h);
    }
  }
  frame();
}

// ── SCREENS ─────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function hideScreen(id) { document.getElementById(id).classList.add('hidden'); }

function showOptions() {
  showScreen('options-screen');
}

// ── GAME START ───────────────────────────────
function startNewGame() {
  Audio.resume();
  G.chapter = 0;
  G.scene = '';
  G.inventory = [];
  G.notes = [];
  G.flags = {};
  G.selectedItem = null;

  cancelAnimationFrame(menuAnimId);
  Audio.stopRandomCreaks();

  // Play intro cinematic
  showScreen('cinematic-screen');
  Cinematic.play('intro', ()=>{
    startChapter(1);
  });
}

function loadGame() {
  Audio.resume();
  const save = localStorage.getItem('tc_save');
  if(!save) return;
  try {
    const d = JSON.parse(save);
    G.chapter   = d.chapter;
    G.scene     = d.scene;
    G.inventory = d.inventory;
    G.notes     = d.notes;
    G.flags     = d.flags;
    G.selectedItem = null;
    cancelAnimationFrame(menuAnimId);
    showScreen('game-screen');
    gotoScene(G.scene || 'fastfood_outside');
  } catch(e) { alert('Sauvegarde corrompue.'); }
}

function saveGame() {
  localStorage.setItem('tc_save', JSON.stringify({
    chapter: G.chapter, scene: G.scene,
    inventory: G.inventory, notes: G.notes, flags: G.flags
  }));
  document.getElementById('btn-continue').disabled = false;
}

// ── CHAPTERS ─────────────────────────────────
function startChapter(n) {
  G.chapter = n;
  showScreen('game-screen');

  const chapterTitles = {
    1: { num:'ACTE I',    name:'Exploration' },
    2: { num:'ACTE II',   name:'La Montée des Ténèbres' },
    3: { num:'ACTE III',  name:'Seul dans l\'Obscurité' },
    4: { num:'ACTE IV',   name:'Le Sauveur' },
    5: { num:'ACTE FINAL',name:'La Confrontation' },
  };

  const ct = chapterTitles[n];
  if(ct) {
    const card = document.getElementById('chapter-card');
    document.getElementById('chapter-number').textContent = ct.num;
    document.getElementById('chapter-name').textContent = ct.name;
    card.classList.remove('hidden');
    setTimeout(()=>card.classList.add('hidden'), 3500);
  }

  const sceneMap = {1:'fastfood_outside', 2:'fastfood_dining', 3:'basement', 4:'ritual_chamber', 5:'ritual_chamber'};
  setTimeout(()=>{
    gotoScene(sceneMap[n] || 'fastfood_outside');
  }, ct ? 1000 : 0);

  if(n===2) { Audio.play('stinger'); startScreamers(); }
  if(n>=3)  { document.getElementById('game-screen').classList.add('tense-mode'); }
}

function advanceChapter(n) {
  if(n <= G.chapter) return;
  G.chapter = n;
  startChapter(n);
}

// ── SCENE NAVIGATION ─────────────────────────
function gotoScene(sceneId) {
  G.scene = sceneId;
  const def = SCENES_DEF[sceneId];
  if(!def) return;

  Audio.stopRandomCreaks();
  Audio.playAmbient(def.ambient || 'factory');
  Audio.startRandomCreaks(def.creaks || 'low');

  document.getElementById('location-name').textContent = def.name;
  renderScene();
  buildHotspots(def);
  if(def.onEnter) def.onEnter();
  startSceneLoop();
}

function startSceneLoop() {
  if(G.sceneAnim) cancelAnimationFrame(G.sceneAnim);
  function loop() {
    G.sceneAnim = requestAnimationFrame(loop);
    if(!G.paused && !G.dialogActive && !G.puzzleActive) {
      renderScene();
    }
  }
  loop();
}

function renderScene() {
  const def = SCENES_DEF[G.scene];
  if(!def || !def.draw) return;
  const ctx=G.sceneCtx, w=G.sceneCanvas.width, h=G.sceneCanvas.height;
  ctx.clearRect(0,0,w,h);
  def.draw(ctx, w, h);
}

// ── HOTSPOTS ─────────────────────────────────
function buildHotspots(def) {
  const layer = document.getElementById('hotspots-layer');
  layer.innerHTML = '';
  if(!def.hotspots) return;

  def.hotspots.forEach(hs => {
    // Skip if flag condition not met
    if(hs.hideIfFlag && G.flags[hs.hideIfFlag]) return;
    // Show only if flag required
    if(hs.id === 'hs_hidden_door' && !G.flags.shelf_moved) return;
    if(hs.id === 'hs_ritual_puzzle' && (!G.flags.found_flamby_note)) return;
    if(hs.id === 'hs_ritual_circle' && G.flags.found_flamby_note) return;
    if(hs.id === 'hs_summon' && !G.flags.ritual_complete) return;

    const div = document.createElement('div');
    div.className = 'hotspot';
    div.style.left = hs.x;
    div.style.top  = hs.y;
    div.style.width= hs.w;
    div.style.height=hs.h;

    const label = document.createElement('span');
    label.className = 'hotspot-label';
    label.textContent = hs.label;
    div.appendChild(label);

    const pulse = document.createElement('div');
    pulse.className = 'hotspot-pulse';
    div.appendChild(pulse);

    div.addEventListener('click', ()=>handleHotspot(hs));
    layer.appendChild(div);
  });
}

// ── ACTIONS ──────────────────────────────────
function handleHotspot(hs) {
  if(G.dialogActive || G.puzzleActive || G.paused) return;
  Audio.play('click');

  const action = hs.action;

  // Locked door checks
  if(hs.locked) {
    if(hs.needsItem && !G.inventory.includes(hs.needsItem)) {
      showToast('Cette porte est verrouillée.');
      Audio.play('door_creak');
      return;
    }
    if(hs.needsPuzzle && !G.flags[hs.needsPuzzle+'_done']) {
      openPuzzle(hs.needsPuzzle);
      return;
    }
  }

  // Needs items for ritual
  if(hs.action === 'placement_puzzle') {
    const needed = ['fragment_cuve','formule_x77','sceau_tc'];
    const missing = needed.filter(it=>!G.inventory.includes(it));
    if(missing.length > 0) {
      showToast(`Il vous manque des artefacts (${missing.length} restant${missing.length>1?'s':''}).`);
      return;
    }
  }

  switch(action) {
    case 'go_outside':     gotoScene('fastfood_outside'); break;
    case 'go_dining':      enterDoor(); break;
    case 'go_kitchen':     enterKitchen(); break;
    case 'go_storage':     Audio.play('door_creak'); gotoScene(G.scene==='fastfood_storage'?'fastfood_kitchen':'fastfood_storage'); break;
    case 'go_basement':    Audio.play('door_creak'); gotoScene('basement'); break;
    case 'go_lab':         Audio.play('door_creak'); gotoScene('lab_main'); break;
    case 'go_chamber':     Audio.play('door_creak'); gotoScene('ritual_chamber'); break;
    case 'look_sign':      showToast('"TastyCrousty" — l\'enseigne clignote faiblement. Certaines lettres sont brûlées.'); break;
    case 'search_dumpster':searchDumpster(); break;
    case 'search_counter': searchCounter(); break;
    case 'read_menu':      showNote('note_memo_w1'); break;
    case 'stain_inspect':  scheduleDialog('act1_stain_investigate', 100); break;
    case 'search_table':   searchUnderTable(); break;
    case 'open_freezer':   openFreezer(); break;
    case 'search_locker':  searchLocker(); break;
    case 'search_crate':   searchCrate(); break;
    case 'examine_boxes':  examineBoxes(); break;
    case 'find_hidden':    gotoBasement(); break;
    case 'move_shelf':     moveShelf(); break;
    case 'search_desk':    searchDesk(); break;
    case 'search_cabinet': searchCabinet(); break;
    case 'view_wall':      viewWallDrawings(); break;
    case 'read_journal':   readJournal(); break;
    case 'examine_jars':   examineJars(); break;
    case 'open_lab_door':  openPuzzle('code_puzzle'); break;
    case 'read_whiteboard':readWhiteboard(); break;
    case 'examine_circle': examineCircle(); break;
    case 'placement_puzzle': openPuzzle('placement_puzzle'); break;
    case 'examine_altar':  examineAltar(); break;
    case 'summon_flamby':  summonFlamby(); break;
  }
}

// ── SPECIFIC ACTIONS ─────────────────────────
function enterDoor() {
  Audio.play('door_creak');
  if(G.chapter < 1) advanceChapter(1);
  gotoScene('fastfood_dining');
}

function enterKitchen() {
  if(!G.inventory.includes('kitchen_key') && !G.flags.kitchen_unlocked) {
    scheduleDialog('act1_freezer_before', 100);
    showToast('La porte est verrouillée. Il faut une clé.');
    return;
  }
  G.flags.kitchen_unlocked = true;
  Audio.play('door_creak');
  gotoScene('fastfood_kitchen');
}

function searchDumpster() {
  if(G.flags.dumpster_searched) { showToast('Vous avez déjà fouillé ici.'); return; }
  G.flags.dumpster_searched = true;
  Audio.play('paper_pickup');
  addItem('crowbar','🔧','Pied-de-biche');
  showToast('Vous trouvez un pied-de-biche rouillé. Utile ?');
}

function searchCounter() {
  if(G.flags.counter_searched) { showToast('Vous avez déjà fouillé ici.'); return; }
  G.flags.counter_searched = true;
  Audio.play('item_pickup');
  addItem('kitchen_key','🗝️','Clé Cuisine');
  showToast('Clé de la cuisine trouvée !');
  scheduleDialog('act1_found_memo', 400);
}

function searchUnderTable() {
  if(G.flags.table_searched) { showToast('Rien de plus ici.'); return; }
  G.flags.table_searched = true;
  Audio.play('paper_pickup');
  showNote('note_scratched');
}

function openFreezer() {
  if(G.flags.freezer_opened) { showToast('Le congélateur est vide... et froid.'); return; }
  scheduleDialog('act1_freezer_before', 100);

  setTimeout(()=>{
    if(G.chapter < 1 || G.flags.freezer_screamed) return;
    G.flags.freezer_opened = true;

    if(G.chapter >= 1) {
      // Screamer!
      setTimeout(()=>{
        G.flags.freezer_screamed = true;
        triggerScreamer('freezer', ()=>{
          showToast('Le congélateur est vide. Il n\'y a plus rien ici.');
          // Advance to act2 after this
          if(G.chapter < 2) {
            setTimeout(()=>advanceChapter(2), 2000);
          }
        });
      }, 800);
    }
  }, 2000);
}

function searchLocker() {
  if(G.flags.locker_searched) { showToast('Les casiers sont vides.'); return; }
  G.flags.locker_searched = true;
  Audio.play('door_creak');
  Audio.play('paper_pickup');
  showNote('note_journal_day1');
}

function searchCrate() {
  if(G.flags.crate_searched) { showToast('Ces caisses sont vides.'); return; }
  G.flags.crate_searched = true;
  Audio.play('item_pickup');
  addItem('fragment_cuve','🪨','Fragment Cuve Nº6');
  showToast('Fragment de la Cuve Nº6 récupéré. Un artéfact étrange...');
}

function examineBoxes() {
  if(!G.flags.boxes_examined) {
    G.flags.boxes_examined = true;
    showToast('Des dizaines de boîtes TastyCrousty. Date de péremption : "JAMAIS". Le lot #666 brille d\'une lueur rouge.');
    Audio.play('stinger');
    scheduleDialog('act2_byilhan_panic', 1000);
  } else {
    showToast('Ces boîtes vous mettent mal à l\'aise.');
  }
}

function moveShelf() {
  if(!G.inventory.includes('crowbar')) {
    showToast('Cette étagère est trop lourde. Il vous faudrait un outil.');
    return;
  }
  Audio.play('door_creak');
  G.flags.shelf_moved = true;
  showToast('L\'étagère révèle un passage secret vers le sous-sol !');
  buildHotspots(SCENES_DEF[G.scene]);
}

function gotoBasement() {
  Audio.play('door_creak');
  Audio.play('wind');
  showToast('Vous descendez dans l\'obscurité...');
  setTimeout(()=>{
    gotoScene('basement');
    if(G.chapter < 3) advanceChapter(3);
  }, 1000);
}

function searchDesk() {
  if(G.flags.desk_searched) { showToast('Vous avez déjà fouillé ici.'); return; }
  G.flags.desk_searched = true;
  Audio.play('paper_pickup');
  addItem('formule_x77','📜','Formule X-77');
  showNote('note_warning_flamby');
}

function searchCabinet() {
  if(G.flags.cabinet_searched) { showToast('Les dossiers sont éparpillés.'); return; }
  G.flags.cabinet_searched = true;
  Audio.play('paper_pickup');
  showNote('note_journal_day47');
  scheduleDialog('act3_found_flamby_note', 4000);
  G.flags.found_flamby_note = true;
  addItem('sceau_tc','🔖','Sceau TastyCrousty');
  buildHotspots(SCENES_DEF[G.scene]);
}

function viewWallDrawings() {
  showToast('Des dizaines d\'yeux dessinés au mur... et des mots : "IL REVIENT. IL EST DANS LES MURS. TROUVEZ FLAMBY."');
  Audio.play('heartbeat');
}

function readJournal() {
  showNote('note_journal_day47');
}

function examineJars() {
  showToast('Des bocaux contenant de petites créatures... Des TastyCrousty en phase larvaire. Ils bougent encore.');
  Audio.play('stinger');
  if(!G.flags.jars_scream && G.chapter >= 3) {
    G.flags.jars_scream = true;
    setTimeout(()=>triggerScreamer('jar', ()=>{}), 1500);
  }
}

function readWhiteboard() {
  showToast('"Sujet F (FLAMBY) — Ventre de Fer confirmé. Immunité X-77 : 100%. Solution finale : MANGER. Protocole Sauveur ACTIF."');
  if(!G.flags.found_flamby_note) {
    G.flags.found_flamby_note = true;
    buildHotspots(SCENES_DEF[G.scene]);
    showToast('Important ! Flamby est la clé. Vous devez trouver les 3 artefacts pour le cercle rituel.');
  }
}

function examineCircle() {
  showToast('Un cercle rituel gravé dans le sol. Il faut y placer les 3 artefacts : Fragment de Cuve, Formule X-77, Sceau TastyCrousty.');
}

function examineAltar() {
  if(!G.flags.ritual_complete) {
    showToast('L\'autel attend. Il faut accomplir le rituel dans le laboratoire d\'abord.');
  } else {
    showToast('L\'autel vibre d\'une énergie étrange. Le TastyCrousty sera attiré ici.');
  }
}

function summonFlamby() {
  if(!G.flags.ritual_complete) { showToast('Le rituel n\'est pas accompli.'); return; }
  G.flags.flamby_summoned = true;
  scheduleDialog('act4_flamby_arrives', 500);
  scheduleDialog('act4_flamby_explains', 8000);
  scheduleDialog('act4_prep_ritual', 16000);
  scheduleDialog('final_confrontation', 24000);
  setTimeout(()=>{
    showScreen('cinematic-screen');
    Cinematic.play('byilhan_death', ()=>{
      // After byilhan cinematic, skip to finale if chapter 2
      if(G.chapter === 2) {
        advanceChapter(3);
        gotoScene('basement');
      } else {
        // It's the finale
        setTimeout(()=>{
          showScreen('cinematic-screen');
          Cinematic.play('finale', ()=>startEpilogue());
        }, 500);
      }
    });
  }, 30000);
}

// ════════════════════════════════════════════════
// 7. SYSTÈME DE DIALOGUE
// ════════════════════════════════════════════════
let dialogQueue = [];
let currentDialogIdx = 0;
let currentDialogLines = [];

function scheduleDialog(key, delayMs=0) {
  setTimeout(()=>startDialog(key), delayMs);
}

function startDialog(key) {
  if(!DIALOGS[key]) return;
  currentDialogLines = DIALOGS[key];
  currentDialogIdx = 0;
  G.dialogActive = true;
  showDialogLine();
}

function showDialogLine() {
  if(currentDialogIdx >= currentDialogLines.length) {
    closeDialog();
    return;
  }
  const line = currentDialogLines[currentDialogIdx];
  const box = document.getElementById('dialog-box');
  box.classList.remove('hidden');

  document.getElementById('dialog-speaker-name').textContent = line.speaker;
  document.getElementById('dialog-text-area').textContent = '';

  const portrait = document.getElementById('dialog-portrait');
  if(line.portrait) {
    portrait.src = `assets/characters/${line.portrait}.png`;
    portrait.style.display = 'block';
  } else {
    portrait.style.display = 'none';
  }

  // Typewriter effect
  let charIdx=0;
  const text = line.text;
  clearInterval(G._typeTimer);
  G._typeTimer = setInterval(()=>{
    document.getElementById('dialog-text-area').textContent = text.slice(0, ++charIdx);
    if(charIdx >= text.length) clearInterval(G._typeTimer);
  }, 22);

  Audio.play('footstep');
}

function advanceDialog() {
  clearInterval(G._typeTimer);
  const textArea = document.getElementById('dialog-text-area');
  const line = currentDialogLines[currentDialogIdx];
  if(textArea.textContent.length < line.text.length) {
    // Finish current line immediately
    textArea.textContent = line.text;
    return;
  }
  currentDialogIdx++;
  if(currentDialogIdx < currentDialogLines.length) {
    showDialogLine();
  } else {
    closeDialog();
  }
}

function closeDialog() {
  G.dialogActive = false;
  document.getElementById('dialog-box').classList.add('hidden');
}

// ════════════════════════════════════════════════
// 8. NOTES
// ════════════════════════════════════════════════
function showNote(noteId) {
  const note = NOTES_DATA[noteId];
  if(!note) return;
  Audio.play('paper_pickup');

  if(!G.notes.includes(noteId)) {
    G.notes.push(noteId);
    document.getElementById('notes-count').textContent = `Notes : ${G.notes.length}`;
  }

  document.getElementById('note-title-area').textContent = note.title;
  document.getElementById('note-body').textContent = note.body;
  document.getElementById('note-reader').classList.remove('hidden');
}

function closeNote() {
  document.getElementById('note-reader').classList.add('hidden');
}

// ════════════════════════════════════════════════
// 9. INVENTAIRE
// ════════════════════════════════════════════════
function addItem(id, emoji, name) {
  if(G.inventory.includes(id)) return;
  G.inventory.push(id);
  Audio.play('item_pickup');
  renderInventory();
}

function renderInventory() {
  const slots = document.getElementById('inv-slots');
  slots.innerHTML = '';
  G.inventory.forEach(id => {
    const items = {
      'kitchen_key': {e:'🗝️', n:'Clé Cuisine'},
      'crowbar':     {e:'🔧', n:'Pied-de-biche'},
      'fragment_cuve':{e:'🪨', n:'Fragment Cuve'},
      'formule_x77': {e:'📜', n:'Formule X-77'},
      'sceau_tc':    {e:'🔖', n:'Sceau TC'},
    };
    const item = items[id] || {e:'?',n:id};
    const div = document.createElement('div');
    div.className = 'inv-item' + (G.selectedItem===id ? ' selected' : '');
    div.innerHTML = `${item.e}<span class="inv-item-name">${item.n}</span>`;
    div.addEventListener('click', ()=>{
      G.selectedItem = (G.selectedItem===id) ? null : id;
      renderInventory();
    });
    slots.appendChild(div);
  });
}

// ════════════════════════════════════════════════
// 10. PUZZLES
// ════════════════════════════════════════════════
function openPuzzle(type) {
  G.puzzleActive = true;
  const overlay = document.getElementById('puzzle-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('puzzle-feedback').textContent = '';

  switch(type) {
    case 'code_puzzle':    buildCodePuzzle(); break;
    case 'switch_puzzle':  buildSwitchPuzzle(); break;
    case 'placement_puzzle': buildPlacementPuzzle(); break;
  }
}

function closePuzzle() {
  G.puzzleActive = false;
  document.getElementById('puzzle-overlay').classList.add('hidden');
}

function showPuzzleFeedback(msg, color='#ffcc00') {
  const fb = document.getElementById('puzzle-feedback');
  fb.style.color = color;
  fb.textContent = msg;
}

// ── CODE PUZZLE ──────────────────────────────
function buildCodePuzzle() {
  document.getElementById('puzzle-title').textContent = 'Accès Verrouillé';
  const content = document.getElementById('puzzle-content');
  content.innerHTML = `
    <p class="puzzle-hint">Un panneau de contrôle électronique. Il faut un code à 4 chiffres.</p>
    <p class="puzzle-hint" style="color:#cc4400;margin-top:4px;">Indice : "L\'année où tout a commencé..."</p>
    <div class="code-inputs">
      <input class="code-digit" maxlength="1" id="cd0" type="text" inputmode="numeric">
      <input class="code-digit" maxlength="1" id="cd1" type="text" inputmode="numeric">
      <input class="code-digit" maxlength="1" id="cd2" type="text" inputmode="numeric">
      <input class="code-digit" maxlength="1" id="cd3" type="text" inputmode="numeric">
    </div>
    <button class="puzzle-submit" id="code-submit">VALIDER LE CODE</button>
  `;
  // Auto-advance between digits
  [0,1,2,3].forEach(i=>{
    const inp = document.getElementById(`cd${i}`);
    inp.addEventListener('input', ()=>{
      if(inp.value.length === 1 && i < 3) document.getElementById(`cd${i+1}`).focus();
    });
    inp.addEventListener('keydown', e=>{
      if(e.key==='Backspace' && inp.value==='' && i>0) document.getElementById(`cd${i-1}`).focus();
    });
  });
  document.getElementById('code-submit').addEventListener('click', ()=>{
    const code = [0,1,2,3].map(i=>document.getElementById(`cd${i}`).value).join('');
    if(code === '1997') {
      Audio.play('puzzle_success');
      showPuzzleFeedback('✓ Code accepté !', '#00cc66');
      G.flags.lab_unlocked = true;
      G.flags.code_puzzle_done = true;
      setTimeout(()=>{ closePuzzle(); showToast('La porte du laboratoire s\'ouvre !'); buildHotspots(SCENES_DEF[G.scene]); }, 1200);
    } else {
      Audio.play('puzzle_fail');
      showPuzzleFeedback('✗ Code incorrect.', '#ff3333');
      [0,1,2,3].forEach(i=>{ document.getElementById(`cd${i}`).value=''; });
      document.getElementById('cd0').focus();
      triggerFlicker();
    }
  });
  setTimeout(()=>document.getElementById('cd0').focus(), 100);
}

// ── SWITCH PUZZLE ─────────────────────────────
function buildSwitchPuzzle() {
  document.getElementById('puzzle-title').textContent = 'Tableau Électrique';
  const content = document.getElementById('puzzle-content');
  const correctOrder = [0, 2, 1]; // Switch indices to activate in order
  let sequence = [];
  const switchStates = [false, false, false];

  content.innerHTML = `
    <p class="puzzle-hint">Activez les interrupteurs dans le bon ordre.<br>Indice : "Gauche, Droite, Centre"</p>
    <div class="switches-row">
      ${['G','D','C'].map((l,i)=>`
        <div class="switch-btn" id="sw${i}" data-idx="${i}">
          <div class="sw-indicator"></div>
          <div class="sw-label">${l}</div>
        </div>
      `).join('')}
    </div>
    <button class="puzzle-submit" id="switch-submit">VALIDER</button>
  `;

  document.querySelectorAll('.switch-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.idx);
      switchStates[idx] = !switchStates[idx];
      btn.classList.toggle('on', switchStates[idx]);
      Audio.play('qte_press');
      if(switchStates[idx]) sequence.push(idx);
      else sequence = sequence.filter(x=>x!==idx);
    });
  });

  document.getElementById('switch-submit').addEventListener('click', ()=>{
    // Check if switches 0 and 2 are on, 1 is off (G, D, not C)
    if(switchStates[0] && !switchStates[1] && switchStates[2]) {
      Audio.play('puzzle_success');
      showPuzzleFeedback('✓ Circuit activé !', '#00cc66');
      G.flags.switch_puzzle_done = true;
      setTimeout(()=>{ closePuzzle(); showToast('Le générateur s\'active !'); }, 1200);
    } else {
      Audio.play('puzzle_fail');
      showPuzzleFeedback('✗ Mauvaise combinaison. Court-circuit !', '#ff3333');
      triggerFlicker();
    }
  });
}

// ── PLACEMENT PUZZLE ─────────────────────────
function buildPlacementPuzzle() {
  document.getElementById('puzzle-title').textContent = 'Cercle Rituel';
  const content = document.getElementById('puzzle-content');

  // Correct positions: fragment=top, formule=bottom-left, sceau=bottom-right
  const slots = [
    {id:'slot_top',   label:'Haut',   correct:'fragment_cuve', placed:null},
    {id:'slot_left',  label:'G-Bas',  correct:'formule_x77',   placed:null},
    {id:'slot_right', label:'D-Bas',  correct:'sceau_tc',       placed:null},
  ];
  const items = [
    {id:'fragment_cuve', emoji:'🪨', name:'Fragment Cuve'},
    {id:'formule_x77',   emoji:'📜', name:'Formule X-77'},
    {id:'sceau_tc',      emoji:'🔖', name:'Sceau TC'},
  ];
  let selectedItem = null;

  function render() {
    content.innerHTML = `
      <p class="puzzle-hint">Placez chaque artefact dans la bonne position du cercle.<br>Sélectionnez un objet puis cliquez sur une position.</p>
      <div class="placement-grid" style="grid-template-columns:80px 80px 80px; grid-template-rows:80px 80px;">
        <div></div>
        <div class="place-slot ${slots[0].placed?'filled':''} ${slots[0].feedback||''}" id="slot_top">
          ${slots[0].placed ? items.find(i=>i.id===slots[0].placed)?.emoji||'' : '?'}
          <span class="place-slot-label">${slots[0].label}</span>
        </div>
        <div></div>
        <div class="place-slot ${slots[1].placed?'filled':''} ${slots[1].feedback||''}" id="slot_left">
          ${slots[1].placed ? items.find(i=>i.id===slots[1].placed)?.emoji||'' : '?'}
          <span class="place-slot-label">${slots[1].label}</span>
        </div>
        <div></div>
        <div class="place-slot ${slots[2].placed?'filled':''} ${slots[2].feedback||''}" id="slot_right">
          ${slots[2].placed ? items.find(i=>i.id===slots[2].placed)?.emoji||'' : '?'}
          <span class="place-slot-label">${slots[2].label}</span>
        </div>
      </div>
      <div class="placement-items">
        ${items.map(it=>`<div class="place-item ${selectedItem===it.id?'selected':''} ${slots.some(s=>s.placed===it.id)?'placed':''}" data-item="${it.id}" title="${it.name}">${it.emoji}</div>`).join('')}
      </div>
      <button class="puzzle-submit" id="place-submit">ACTIVER LE RITUEL</button>
    `;

    document.querySelectorAll('.place-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        selectedItem = el.dataset.item;
        render();
      });
    });
    document.querySelectorAll('.place-slot').forEach((el,idx)=>{
      el.addEventListener('click', ()=>{
        if(!selectedItem) return;
        slots[idx].placed = selectedItem;
        selectedItem = null;
        Audio.play('item_pickup');
        render();
      });
    });
    document.getElementById('place-submit')?.addEventListener('click', ()=>{
      const allCorrect = slots.every(s => s.placed === s.correct);
      slots.forEach(s=> s.feedback = s.placed===s.correct ? 'correct' : s.placed ? 'wrong' : '');
      render();
      if(allCorrect) {
        Audio.play('puzzle_success');
        showPuzzleFeedback('✓ Le cercle s\'illumine ! Le rituel peut commencer !', '#00cc66');
        G.flags.ritual_complete = true;
        setTimeout(()=>{
          closePuzzle();
          showToast('Le rituel est accompli ! Rendez-vous dans la Chambre Rituelle.');
          buildHotspots(SCENES_DEF[G.scene]);
        }, 1500);
      } else {
        Audio.play('puzzle_fail');
        showPuzzleFeedback('✗ Mauvais placement. Les artefacts résistent.', '#ff3333');
        triggerFlicker();
        setTimeout(()=>{slots.forEach(s=>s.feedback=''); render();}, 1200);
      }
    });
  }
  render();
}

// ════════════════════════════════════════════════
// 11. SCREAMERS (JUMPSCARES)
// ════════════════════════════════════════════════
function triggerScreamer(type, callback) {
  Audio.play('screamer');
  const overlay = document.getElementById('screamer-overlay');
  overlay.classList.remove('hidden');
  drawScreamer(type);

  // Camera shake effect
  const gameScreen = document.getElementById('game-screen');
  gameScreen.style.transform='translateX(8px)';
  setTimeout(()=>gameScreen.style.transform='translateX(-8px)',50);
  setTimeout(()=>gameScreen.style.transform='translateX(4px)',100);
  setTimeout(()=>gameScreen.style.transform='',150);

  setTimeout(()=>{
    overlay.classList.add('hidden');
    G.screamerCtx.clearRect(0,0,G.screamerCanvas.width,G.screamerCanvas.height);
    if(callback) callback();
  }, 1600);
}

function drawScreamer(type) {
  const ctx = G.screamerCtx;
  const w = G.screamerCanvas.width, h = G.screamerCanvas.height;
  ctx.clearRect(0,0,w,h);

  // Background flash
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0,0,w,h);

  // Draw TastyCrousty face
  const cx=w/2, cy=h/2, r=Math.min(w,h)*0.38;

  // Body
  ctx.fillStyle = '#8b4500';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r*0.7, 0, 0, Math.PI*2);
  ctx.fill();

  // Texture bumps
  for(let i=0;i<12;i++){
    const bx = cx+(Math.random()-.5)*r*1.6, by=cy+(Math.random()-.5)*r;
    ctx.fillStyle = '#6b3500';
    ctx.beginPath(); ctx.arc(bx, by, r*0.06+Math.random()*r*0.05, 0, Math.PI*2); ctx.fill();
  }

  // Eyes (glowing red)
  [[-0.3,-.15],[0.3,-.15]].forEach(([ex,ey])=>{
    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(cx+ex*r, cy+ey*r, r*0.1, r*0.1, 0, 0, Math.PI*2); ctx.fill();
    // Iris
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.ellipse(cx+ex*r, cy+ey*r, r*0.07, r*0.07, 0, 0, Math.PI*2); ctx.fill();
    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(cx+ex*r, cy+ey*r, r*0.04, r*0.04, 0, 0, Math.PI*2); ctx.fill();
    // Glow
    const eg=ctx.createRadialGradient(cx+ex*r,cy+ey*r,0,cx+ex*r,cy+ey*r,r*0.2);
    eg.addColorStop(0,'rgba(255,0,0,0.6)'); eg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=eg; ctx.fillRect(0,0,w,h);
  });

  // Mouth (open, screaming)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(cx, cy+r*0.22, r*0.32, r*0.2, 0, 0, Math.PI*2);
  ctx.fill();

  // Teeth
  ctx.fillStyle = '#e8e0c0';
  for(let i=-3;i<=3;i++){
    ctx.beginPath();
    ctx.moveTo(cx+i*r*0.08, cy+r*0.08);
    ctx.lineTo(cx+i*r*0.08+r*0.04, cy+r*0.08);
    ctx.lineTo(cx+i*r*0.08+r*0.02, cy+r*0.22);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx+i*r*0.08, cy+r*0.38);
    ctx.lineTo(cx+i*r*0.08+r*0.04, cy+r*0.38);
    ctx.lineTo(cx+i*r*0.08+r*0.02, cy+r*0.25);
    ctx.fill();
  }

  // Tendrils
  ctx.strokeStyle='rgba(60,20,0,0.8)'; ctx.lineWidth=r*0.04;
  for(let i=0;i<8;i++){
    const angle = i/8*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(angle)*r, cy+Math.sin(angle)*r*0.7);
    ctx.quadraticCurveTo(
      cx+Math.cos(angle)*r*1.5+Math.sin(angle)*r*0.2,
      cy+Math.sin(angle)*r*1.2+Math.cos(angle)*r*0.2,
      cx+Math.cos(angle)*r*1.8, cy+Math.sin(angle)*r*1.5
    );
    ctx.stroke();
  }

  // TASTYCROUSTY text
  ctx.fillStyle = '#ffcc00';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.font = `bold ${h*0.08}px 'Creepster', cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText('☠ TASTYCROUSTY ☠', cx, h*0.15);
  ctx.fillText('☠ TASTYCROUSTY ☠', cx, h*0.15);

  // Dark vignette
  const vg = ctx.createRadialGradient(cx,cy,r*0.3,cx,cy,r*2);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(0,0,0,0.7)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
}

let screamerScheduled = false;
function startScreamers() {
  if(screamerScheduled) return;
  screamerScheduled = true;
  // Schedule random screamers based on chapter
  setTimeout(()=>{
    if(G.chapter >= 2 && !G.flags.mirror_scream) {
      G.flags.mirror_scream = true;
      triggerScreamer('mirror', ()=>{
        showToast('Vous voyez quelque chose dans l\'obscurité...');
      });
    }
  }, 15000 + Math.random()*10000);
}

// ════════════════════════════════════════════════
// 12. ÉPILOGUE & CRÉDITS
// ════════════════════════════════════════════════
function startEpilogue() {
  Audio.playAmbient('safe');
  Audio.stopRandomCreaks();
  document.getElementById('game-screen').classList.remove('tense-mode');
  showScreen('epilogue-screen');

  scheduleDialog('after_finale', 500);

  const epilogueLines = [
    "Le TastyCrousty Maléfique avait été vaincu.\n\nPar l'estomac d'un homme extraordinaire.",
    "Nico rentra chez lui.\n\nIl ne remangea jamais de TastyCrousty.\n\nPar principe.",
    "Byilhan fut pleuré pendant exactement 3 semaines.\n\nEnsuite Nico commanda une pizza.\n\nC'était ce que Byilhan aurait voulu.",
    "Flamby, lui, rentra chez lui.\n\nIl avait encore faim.\n\nIl commanda 4 pizzas.",
    "L'usine TastyCrousty fut démolie.\n\nSur l'emplacement fut construit un parking.\n\nPersonne ne se demanda jamais pourquoi les voitures garées là-bas avaient parfois les pneus mordus.",
    "FIN"
  ];

  let epIdx = 0;
  function showEpLine() {
    document.getElementById('epilogue-text').innerHTML = epilogueLines[epIdx].replace(/\n/g,'<br>');
    document.getElementById('epilogue-advance').classList.remove('hidden');
  }
  showEpLine();

  document.getElementById('epilogue-advance').addEventListener('click', ()=>{
    epIdx++;
    if(epIdx >= epilogueLines.length) {
      startCredits();
    } else {
      document.getElementById('epilogue-advance').classList.add('hidden');
      document.getElementById('epilogue-text').style.opacity='0';
      setTimeout(()=>{
        showEpLine();
        document.getElementById('epilogue-text').style.transition='opacity 1s ease';
        document.getElementById('epilogue-text').style.opacity='1';
      }, 500);
    }
  });
}

function startCredits() {
  Audio.play('victory');
  showScreen('credits-screen');

  const creditsHtml = `
    <div class="credits-title-main">NICO ET LE TASTYCROUSTY MALÉFIQUE</div>
    <div class="credits-separator">☠ ☠ ☠</div>
    <div class="credits-section">Développé par</div>
    <div class="credits-dev">STIROXBEREAL</div>
    <div class="credits-separator">· · ·</div>
    <div class="credits-section">Scénario & Direction</div>
    <div class="credits-name">STIROXBEREAL</div>
    <div class="credits-separator">· · ·</div>
    <div class="credits-section">Personnages</div>
    <div class="credits-name">NICO — Le Protagoniste</div>
    <div class="credits-name">BYILHAN — L'Ami Courageux</div>
    <div class="credits-name">FLAMBY — Le Sauveur au Ventre de Fer</div>
    <div class="credits-name">LE TASTYCROUSTY — L'Antagoniste Maudit</div>
    <div class="credits-separator">· · ·</div>
    <div class="credits-section">Technologies</div>
    <div class="credits-name">HTML5 / CSS3 / JavaScript</div>
    <div class="credits-name">Three.js (Cinématiques 3D)</div>
    <div class="credits-name">Web Audio API (Sons procéduraux)</div>
    <div class="credits-separator">· · ·</div>
    <div class="credits-section">Lore</div>
    <div class="credits-name">L'origine du TastyCrousty reste un mystère.<br>Le lot #666 n'aurait jamais dû être produit.</div>
    <div class="credits-separator">· · ·</div>
    <div class="credits-section">Message Spécial</div>
    <div class="credits-name" style="color:#d4a017;font-size:1.1rem;">
      Ne consommez pas de TastyCrousty après minuit.<br>
      Nous ne sommes pas responsables des conséquences.
    </div>
    <div class="credits-separator">☠ ☠ ☠</div>
    <div class="credits-dev" style="font-size:2.5rem;margin-top:40px;">MERCI D'AVOIR JOUÉ</div>
    <div class="credits-section" style="margin-top:20px;">© 2024 STIROXBEREAL — Tous droits réservés</div>
  `;

  document.getElementById('credits-scroll').innerHTML = creditsHtml;
}

// ════════════════════════════════════════════════
// 13. UTILITAIRES UI
// ════════════════════════════════════════════════
let toastTimeout = null;
function showToast(msg) {
  let toast = document.getElementById('toast-msg');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.style.cssText = `
      position:fixed; top:60px; left:50%; transform:translateX(-50%);
      background:rgba(10,5,8,.9); color:#c8b8a8;
      border:1px solid rgba(180,20,30,.4); border-top:2px solid #cc1122;
      font-family:'Oswald',sans-serif; font-size:.8rem; letter-spacing:2px;
      padding:10px 20px; max-width:60vw; text-align:center;
      z-index:80; box-shadow:0 4px 20px rgba(0,0,0,.6);
      transition:opacity .3s ease;
    `;
    document.getElementById('game-screen').appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity='1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>toast.style.opacity='0', 3000);
}

function showFeedback(msg) { showToast(msg); }

function triggerFlicker() {
  const fl = document.getElementById('flicker-overlay');
  fl.classList.add('flicker-on');
  setTimeout(()=>fl.classList.remove('flicker-on'), 150);
  setTimeout(()=>fl.classList.add('flicker-on'), 200);
  setTimeout(()=>fl.classList.remove('flicker-on'), 350);
}

function togglePause() {
  G.paused = !G.paused;
  document.getElementById('pause-menu').classList.toggle('hidden', !G.paused);
}
function hidePause() {
  G.paused = false;
  document.getElementById('pause-menu').classList.add('hidden');
}

function onKeyDown(e) {
  if(e.key==='Escape') {
    if(G.puzzleActive) closePuzzle();
    else if(document.getElementById('note-reader').classList.contains('hidden')===false) closeNote();
    else if(G.dialogActive) closeDialog();
    else togglePause();
  }
  if(e.key===' ' || e.key==='Enter') {
    if(G.dialogActive) advanceDialog();
  }
}

// ════════════════════════════════════════════════
// 14. CHAPTER 2 TRIGGER — special Byilhan death
// ════════════════════════════════════════════════
// This gets called when chapter 2 is reached and Byilhan death needs to trigger
function checkByilhanDeath() {
  if(G.chapter === 2 && G.flags.byilhan_death_ready && !G.flags.byilhan_dead) {
    G.flags.byilhan_dead = true;
    setTimeout(()=>{
      showScreen('cinematic-screen');
      Cinematic.play('byilhan_death', ()=>{
        advanceChapter(3);
        gotoScene('office');
        setTimeout(()=>scheduleDialog('act3_alone_monologue', 1000), 500);
      });
    }, 2000);
  }
}

// Override advanceChapter to handle byilhan death cinematic
const _origAdvance = advanceChapter;
function advanceChapter(n) {
  if(n === 3 && !G.flags.byilhan_dead && G.chapter === 2) {
    // Trigger byilhan death cinematic first
    G.flags.byilhan_dead = true;
    showScreen('cinematic-screen');
    Cinematic.play('byilhan_death', ()=>{
      G.chapter = 3;
      const card = document.getElementById('chapter-card');
      document.getElementById('chapter-number').textContent = 'ACTE III';
      document.getElementById('chapter-name').textContent = 'Seul dans l\'Obscurité';
      card.classList.remove('hidden');
      setTimeout(()=>card.classList.add('hidden'), 3500);
      showScreen('game-screen');
      Audio.playAmbient('horror');
      Audio.startRandomCreaks('high');
      document.getElementById('game-screen').classList.add('tense-mode');
      gotoScene('office');
      setTimeout(()=>scheduleDialog('act3_alone_monologue', 800), 1500);
    });
    return;
  }
  if(n <= G.chapter) return;
  G.chapter = n;

  const chapterTitles = {
    1: { num:'ACTE I',    name:'Exploration' },
    2: { num:'ACTE II',   name:'La Montée des Ténèbres' },
    4: { num:'ACTE IV',   name:'Le Sauveur' },
    5: { num:'ACTE FINAL',name:'La Confrontation' },
  };
  const ct = chapterTitles[n];
  if(ct) {
    const card = document.getElementById('chapter-card');
    document.getElementById('chapter-number').textContent = ct.num;
    document.getElementById('chapter-name').textContent = ct.name;
    card.classList.remove('hidden');
    setTimeout(()=>card.classList.add('hidden'), 3500);
  }

  if(n===2) { Audio.play('stinger'); startScreamers(); }
  if(n>=3)  { document.getElementById('game-screen').classList.add('tense-mode'); }

  const sceneMap = {4:'ritual_chamber', 5:'ritual_chamber'};
  if(sceneMap[n]) {
    setTimeout(()=>gotoScene(sceneMap[n]), ct ? 1000 : 0);
  }
}

// ════════════════════════════════════════════════
// 15. FINAL SEQUENCE
// ════════════════════════════════════════════════
// Override summonFlamby to use the correct cinematic
summonFlamby = function() {
  if(!G.flags.ritual_complete) { showToast('Le rituel n\'est pas accompli.'); return; }
  G.flags.flamby_summoned = true;

  advanceChapter(4);
  scheduleDialog('act4_flamby_arrives', 500);
  scheduleDialog('act4_flamby_explains', 9000);
  scheduleDialog('act4_prep_ritual', 18000);

  // Trigger final sequence after dialogs
  setTimeout(()=>{
    scheduleDialog('final_confrontation', 500);
    setTimeout(()=>{
      showScreen('cinematic-screen');
      Cinematic.play('finale', ()=>{
        startEpilogue();
      });
    }, 5000);
  }, 27000);
};

// ════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', init);
