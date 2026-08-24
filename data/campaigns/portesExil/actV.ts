import { AdventureManifest } from '../../../types';

/**
 * LES PORTES DE L'EXIL — ACTE V : « Le Revers » (chapitres 13-15, niv. 13-14)
 * La féerie douce-amère des choses perdues : objets, noms, souvenirs — et les
 * gens complètement oubliés. La Cour des Oubliés garde la Voix de Vantael.
 * L'acte où l'on REND au lieu de prendre ; l'acte des navettes usées et de
 * la vérité de Brindille ; l'acte du choix le plus cruel de la campagne.
 * Ton : féerie des choses perdues (divergence : la quête s'inverse — on vient
 * rendre — voir note d'intention du lore).
 */
export const PE_ACT_V: AdventureManifest['chapters'] = [
  {
    id: '13',
    title: 'Ce Qui Fut Perdu',
    act: 'Acte V — Le Revers',
    objective:
      "Le Revers — interlude dans un Seuil en crise, puis payer l'entrée du plan des choses perdues et apprendre ses quatre lois.",
    status: 'pending',
    scenes: [
      {
        id: '13a',
        title: 'Interlude — le Seuil qui déborde',
        description:
          "L'Entre-Seuil au palier courant de la Couture : les quais débordent de réfugiés des mondes raccordés — et le plus troublant n'est pas leur misère, c'est leur GRATITUDE. La famille Sept-Puits, dont le hameau fut cousu à un verger d'ailleurs, offre des fruits doubles au héros en remerciant « le bon Maître » ; un vieux docker pleure de joie : son quartier d'enfance, rasé jadis, a été recousu au présent — il rentre DORMIR dans sa propre nostalgie chaque soir. Les Combleurs n'ont jamais été si aimés. Frère Rentray affiche les chiffres en façade : tant de logés, tant de nourris, ZÉRO famine dans les zones cousues. Les chiffres sont vrais. C'est l'interlude où le héros doit défendre une abstraction — la liberté de partir — face à des gens rassasiés qui ne lui ont rien demandé.",
        location: 'L’Entre-Seuil — les quais, le tableau des œuvres',
        mood: 'town',
      },
      {
        id: '13b',
        title: 'La frontière du Vrai',
        description:
          "La Porte du Revers ne s'ouvre pas avec une clef : elle s'ouvre avec un PRIX. Le passeur — une haie de brume qui murmure — n'accepte qu'une chose VRAIE : un objet auquel on tient, un souvenir précis (réellement estompé ensuite), ou une promesse (qui devient exigible). Le compagnon embarqué paie AUSSI — et ce qu'il choisit de laisser est une scène à part entière (chaque récurrent a son prix écrit : Halvard sa boussole de première traversée, Oraison une prière qu'elle ne pourra plus dire, Isaure un carnet entier de relevés, Brindille… rien : la haie s'écarte devant elle sans rien demander, et c'est la première anomalie). RÈGLE : la haie ne prend JAMAIS un gage — ce qui est destiné à un adieu lui est sacré, elle le repousse du bout des branches.",
        location: 'Le Revers — la haie-frontière',
        mood: 'tension',
      },
      {
        id: '13c',
        title: 'Le pays de l’égaré',
        description:
          "Le Revers au crépuscule perpétuel doré : des collines de choses perdues rangées avec un soin d'archiviste fou — la vallée des clefs (des millions, suspendues à des fils), le lac des lettres jamais envoyées (on marche dessus, elles portent), la forêt des parapluies, le champ des « je-reviens-tout-de-suite ». Entre les collections errent les OUBLIÉS : des gens que plus personne au monde ne se rappelle — polis, translucides aux bords, terriblement heureux qu'on leur demande leur chemin. Règle immédiate et affichée nulle part : NOMMER une chose la réveille (dire « c'est la clef de chez moi » fait frémir toute la vallée des clefs).",
        location: 'Le Revers — les collines-collections',
        mood: 'exploration',
      },
      {
        id: '13d',
        title: 'La Cour des Oubliés',
        description:
          "Au centre du plan, un palais fait d'objets perdus assemblés en architecture (colonnes de cannes, lustres de bagues, tapisseries de gants dépareillés). La COUR : la Dame Dépareillée (souveraine aux deux gants différents — elle fut deux personnes, dit-on, et l'une a été oubliée), le MAJORDOME-SANS-VISAGE (courtoisie parfaite, visage effacé — il fut quelqu'un que TOUT LE MONDE a oublié, lui compris), et Trouvère, satyre-archiviste qui endort les choses perdues en leur chantant leurs propriétaires. La Cour n'est ni bonne ni cruelle : elle est EXACTE. Elle paie toujours ses dettes, compte toujours les siennes — et elle garde, dans la chapelle des adieux, la VOIX DE VANTAEL. Ses quatre lois sont énoncées d'emblée, gravées sur l'arche : 1. tout ce qui est ici fut oublié — 2. nommer réveille — 3. tout conflit a une issue sans violence, souvent plus chère — 4. on ne repart qu'avec UNE chose retrouvée.",
        location: 'Le Revers — le palais des Oubliés',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'roleplay',
        description:
          "L'audience de la Cour : la Dame Dépareillée reçoit « la chose la moins perdue qui soit jamais entrée ici » (le héros a un monde, un nom, des gens — ici c'est une richesse indécente). Elle propose le marché du plan : la Voix contre « ce que la Cour voudra, au moment où elle le voudra » — ou les épreuves régulières (Ch14-15). Trouvère, en aparté, souffle la vraie règle du lieu : « Ici, on ne PREND pas, gamin. On rend, on rachète, on retrouve. Ceux qui prennent deviennent une collection. »",
        difficulty: 'medium',
        monsters: [],
        reward: "Le Reçu de la Cour (voir table des récompenses) — et l'accès aux salles profondes du palais.",
      },
      {
        type: 'combat',
        description:
          "Une green hag locale — la Regrattière — fait commerce ILLÉGAL de choses perdues (elle les vend à leurs anciens propriétaires, au prix du désespoir). Ses sbires-épouvantails de manteaux perdus attaquent qui fouine. L'issue non violente (loi 3) : la dénoncer à la Cour coûte « une chose vraie » de plus — ou la RUINER en rendant gratuitement trois objets de son étal à leurs Oubliés (la scène est un bonheur d'écriture : trois retrouvailles en cascade).",
        difficulty: 'hard',
        monsters: ['green_hag', 'sprite', 'blink_dog'],
        reward: "L'étal de la Regrattière saisi par la Cour — et la gratitude de trois Oubliés (trois vérités du plan, dont une sur « la galerie des navettes »).",
      },
    ],
    branchingChoices: [
      {
        decision: "Le prix d'entrée du héros à la haie-frontière :",
        optionA:
          "Un OBJET vrai (le plus simple — mais la haie choisit dans l'inventaire ce qui compte VRAIMENT : le miroir d'Ysold, le fanal, la sacoche de Sorrel… et le MJ retire l'objet pour l'acte).",
        optionB:
          "Un SOUVENIR précis (le héros choisit lequel — il s'estompe réellement : le MJ le note et ne le raconte plus jamais ; {{HERO_BOND}} ou {{HERO_WOUND}} sont acceptés, et c'est un vertige).",
        consequence:
          "A : l'objet laissé attend à la haie — récupérable à la sortie CONTRE la loi 4 (il compte comme « chose retrouvée » : le dilemme du Ch15 se resserre d'un cran). B : le souvenir est au Revers désormais — il peut être RETROUVÉ au Ch15 (et compte alors aussi pour la loi 4). PERSISTER : canonFact « Prix d'entrée : [objet/souvenir] ».",
      },
      {
        decision: "Le marché direct de la Dame (la Voix contre une dette ouverte) ?",
        optionA:
          "Signer la dette ouverte (la Voix TOUT DE SUITE — mais « ce que la Cour voudra, quand elle le voudra » est une épée au-dessus de toute la fin de campagne, et la Cour encaisse TOUJOURS — le MJ tient le registre).",
        optionB:
          "Refuser et gagner la Voix aux épreuves (les Ch14-15 entiers — plus long, plus dur, mais on sort du Revers sans laisse).",
        consequence:
          "A : la Voix acquise au Ch13 — et une dette qui TOMBERA au pire moment dramatique (le MJ choisit : pendant le Métier, ou au Chas — c'est écrit comme options). B : la voie régulière des Ch14-15. PERSISTER : canonFact « Dette ouverte signée à la Cour » (A) ou rien (B).",
      },
    ],
    cliffhanger:
      "Le soir, dans l'aile des invités, Brindille ne dort pas. Elle est à la fenêtre, et elle regarde une aile du palais que personne n'a fait visiter — une galerie longue, aux niches régulières, éclairée comme un reliquaire. Quand le héros demande ce que c'est, elle répond sans se retourner, d'une voix qu'on ne lui connaît pas : « La galerie des navettes. Je déteste cet endroit. Je n'y suis jamais venue. » Les deux phrases sont vraies. [La Couture +1 si la sortie du Seuil fut à fil. Si Couture ≥ 6 : cette nuit, quelque part au Seuil, {{COUSU}} reçoit une visite de courtoisie — la prise, elle, viendra au Ch14.]",
  },
  {
    id: '14',
    title: 'Les Navettes Usées',
    act: 'Acte V — Le Revers',
    objective:
      "Le Revers — ouvrir la galerie des navettes, apprendre ce que le héros est en train de devenir, et retrouver ce qui doit l'être.",
    status: 'pending',
    scenes: [
      {
        id: '14a',
        title: 'La galerie des navettes',
        description:
          "Le Majordome ouvre la galerie sans se faire prier — « la Cour n'a pas de secrets, seulement des politesses ». Des niches, une par navette : des âmes liminales d'AVANT, contraintes par Séverin aux premiers siècles — tirées de force à travers les portes jusqu'à CASSER (un fil forcé casse ; une navette cassée n'a plus de monde d'attache : elle échoue ici, avec les choses perdues). Le glaçant n'est pas la cruauté : c'est le SOIN. Chaque niche est entretenue, fleurie, étiquetée d'une écriture appliquée — Séverin monte une fois l'an, nettoie, remplace les fleurs, et repart. Il n'a jamais su jeter. Trouvère chante bas : « Il les a usées, il les veille. Cherchez pas la logique. C'est un homme qui coud. »",
        location: 'Le Revers — la galerie des navettes',
        mood: 'dramatic',
      },
      {
        id: '14b',
        title: 'La niche vide',
        description:
          "Au bout de la galerie, UNE niche vide. Propre, fleurie comme les autres, étiquette retournée. Brindille s'arrête devant, et tout son corps se souvient avant elle : c'est la SIENNE. Elle est une navette usée — la dernière des contraintes, celle qui a cassé le moins docilement (l'étiquette retournée dit : « Pièce indocile. Rendue au perdu. »). Son monde d'attache lui fut arraché dans la casse : d'où le nom perdu, le poids plume, l'œil infaillible pour les choses perdues. Elle est sortie de sa niche TOUTE SEULE, un jour, et a marché jusqu'au Seuil pour regarder les portes que les autres franchissent. La scène est écrite pour être jouée PETIT : pas de cri — elle remet l'étiquette à l'endroit, lisse les fleurs, et dit : « Au moins, chez lui, c'est bien tenu. » Le héros regarde son propre avenir, aligné sur soixante mètres de niches.",
        location: 'Le Revers — la niche vide',
        mood: 'dramatic',
      },
      {
        id: '14c',
        title: 'Ce que cherche le héros',
        description:
          "La chose perdue du héros — {{HERO_WOUND}}, sous sa forme la plus concrète — EST au Revers, et elle le CHERCHE aussi (les choses perdues sentent leurs propriétaires : les collections frémissent sur son passage depuis l'arrivée). La retrouvaille est écrite en scène double : d'abord la traque (suivre le frémissement de colline en colline, Trouvère en guide ému — « j'adore les réunions »), puis le face-à-face — et le piège tendre du plan : la chose retrouvée est EXACTEMENT comme avant. Pas abîmée. Pas changée. Le Revers conserve mieux que la mémoire. La garder, la rendre, ou la laisser — le choix n'est pas pour tout de suite (loi 4 : il se paiera au Ch15), mais le POIDS commence ici.",
        location: 'Le Revers — les collines, la retrouvaille',
        mood: 'tension',
      },
      {
        id: '14d',
        title: 'Le témoin du seuil',
        description:
          "L'INDICE DU REGISTRE nº 4 — le dernier. Le Majordome-sans-visage sert le thé et, à la question sur Séverin, pose sa théière : il ÉTAIT LÀ, jadis. Au seuil du monde qui mourait. Il était le majordome du dernier navire d'évacuation — celui que Séverin a payé « un monde entier, aller simple ». Il a VU le Portier rester sur le quai. Il a entendu ce que Séverin n'a pas dit — l'adieu resté dans sa gorge — parce qu'un majordome entend tout, surtout les silences. Il le récite mot pour mot, de sa voix sans visage : c'est le DERNIER fragment de la page manquante. « Personne ne me l'a jamais demandé, ajoute-t-il. Quatre siècles. Vous êtes le premier à demander ce qu'IL a perdu, lui. » (Posable 2× : ici, ou via Trouvère qui l'a mis en chanson sans le savoir.)",
        location: 'Le Revers — le salon de thé du Majordome',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Si la Couture a atteint 6 : la Trame vient PRENDRE {{COUSU}} — pas ici : la scène est vue par miroir d'Ysold/fanal/messager, impuissance écrite (le Seuil est à un plan de distance) — et le Revers, lui, réagit : des fils d'or sondent la haie-frontière, cherchant les navettes. La Cour se défend (le plan entier se hérisse) ; le héros combat des Cousus REPÊCHEURS à la frontière, aux côtés des Oubliés armés de parapluies et de cannes-épées. Absurde, féerique, poignant — et sérieux : ce que les repêcheurs attrapent est cousu SÉANCE TENANTE.",
        difficulty: 'deadly',
        monsters: ['flesh_golem', 'invisible_stalker', 'specter', 'cult_fanatic'],
        reward: "La haie tient. La Dame Dépareillée déclare la Cour « en délicatesse » avec l'Ourdisseur — un allié de PLAN entier pour la fin (à sa manière exacte et dépareillée).",
      },
      {
        type: 'exploration',
        description:
          "Retrouver la chose du héros dans les collections : une traque d'indices SENSORIELS (le frémissement, l'odeur d'avant, un son de {{HERO_BOND}}) — jets doux, échec impossible, seulement plus ou moins LONG : le Revers veut les retrouvailles, il fait juste payer le chemin en émotions. En route, trois micro-retrouvailles d'Oubliés (écrites) montrent les trois issues possibles : garder, rendre, laisser — le plan enseigne le choix du Ch15 par l'exemple.",
        difficulty: 'medium',
        monsters: [],
        reward: "La chose perdue du héros, en main. Exactement comme avant. C'est le problème.",
      },
    ],
    branchingChoices: [
      {
        decision: "L'étiquette de Brindille — la lui laisser retourner seule, ou l'aider à la retourner ?",
        optionA:
          "Rester à distance respectueuse (elle gère — et vous dira plus tard, peut-être, ce que « Pièce indocile » lui fait ; sa dignité première est sauve).",
        optionB:
          "Poser la main sur l'étiquette avec elle (le geste — elle laisse faire, et pour la première fois depuis le Ch1, elle demande quelque chose : « si un jour tu retrouves mon nom… demande-moi d'abord si je le veux. »).",
        consequence:
          "A : l'arc du nom reste à SA main (elle décidera seule au Ch15 si l'option se présente). B : le héros devient co-dépositaire de l'arc — le choix du Ch15 (« le nom de Brindille » comme chose retrouvée) s'ouvre EXPLICITEMENT, avec sa question préalable écrite. PERSISTER : canonFact « L'étiquette retournée ensemble » (B) ou rien (A).",
      },
      {
        decision: "Le récit du Majordome — lui demander de VENIR le dire lui-même au Chas ?",
        optionA:
          "L'inviter formellement (un Oublié quittant le Revers est un événement d'État : la Cour exige une caution — encore une chose vraie — mais la page manquante LUE PAR SON TÉMOIN au Ch18 vaut double : Séverin ne pourra pas dire « vous inventez »).",
        optionB:
          "Apprendre le récit par cœur et le porter soi-même (aucun coût — mais au Chas, ce sera la parole du héros contre quatre siècles de déni).",
        consequence:
          "A : le Majordome au final (scène écrite — la faiblesse nº 1 en version témoin oculaire, DC réduit). B : la page portée par le héros (version standard de la faiblesse nº 1). PERSISTER : canonFact « Le Majordome viendra au Chas » (A) ou « Récit appris par cœur » (B).",
      },
    ],
    cliffhanger:
      "Au soir, Trouvère chante pour endormir les collections — et au milieu d'une chanson d'inventaire, quatre vers que personne ne lui a appris : « L'aiguille a pleuré sur le quai / le navire a pris la marée / le mot qu'il n'a jamais lâché / c'est moi qui l'ai ramassé. » Il s'arrête, surpris de lui-même : « Tiens. Celle-là, je ne sais pas d'où je la tiens. » Le Majordome, sans visage, sourit — ça s'entend à sa voix : « De moi. Tout finit ici, même les adieux des autres. » [La page manquante est COMPLÈTE. Reste à choisir avec quoi on ressort du Revers.]",
  },
  {
    id: '15',
    title: 'La Voix ou la Chose',
    act: 'Acte V — Le Revers',
    objective:
      "Le Revers — affronter la quatrième loi : on ne repart qu'avec UNE chose retrouvée. Choisir. Payer. Sortir.",
    status: 'pending',
    scenes: [
      {
        id: '15a',
        title: 'La chapelle des adieux',
        description:
          "La Cour ouvre enfin la chapelle des adieux : une rotonde de silence absolu, murs capitonnés de tous les « au revoir » jamais dits (on les ENTEND en frôlant les murs — des milliers, dans toutes les langues, du tendre au déchirant). Au centre, sur un coussin de gants dépareillés : LA VOIX DE VANTAEL — pas un objet : un MOT, suspendu dans l'air, visible comme un souffle par temps froid. Le mot d'adieu originel, celui dont tous les autres sont des copies. La Dame explique la règle sans cruauté : la Voix est une chose perdue comme les autres (Vantael l'a perdue en mourant) — la prendre, c'est user de la loi 4. « Une chose retrouvée. Une seule. C'est la seule loi que même moi je ne peux pas dépareiller. »",
        location: 'Le Revers — la chapelle des adieux',
        mood: 'dramatic',
      },
      {
        id: '15b',
        title: 'Les trois choses possibles',
        description:
          "L'épreuve finale n'est pas un combat : c'est un INVENTAIRE. Devant la Cour assemblée, le héros pose ce qu'il pourrait emporter : LA VOIX DE VANTAEL (l'organe — sans elle, ROUVRIR se ferme, le Raccommodage boite) ; SA CHOSE PERDUE ({{HERO_WOUND}} — intacte, chaude, exactement comme avant) ; LE NOM DE BRINDILLE (si l'arc est ouvert — Trouvère peut le retrouver dans les registres : il EXISTE, et il donne sur un monde d'attache qui l'attend). Et éventuellement : le prix d'entrée laissé à la haie, le souvenir estompé du Ch13 — tout ce qui fut perdu compte. La Cour ne presse pas. Trouvère joue doucement. Les murs murmurent des adieux. C'est le choix le plus cruel de la campagne, et il est écrit pour durer.",
        location: 'Le Revers — la salle du trône dépareillé',
        mood: 'tension',
      },
      {
        id: '15c',
        title: 'L’adieu joué',
        description:
          "Ce qu'on ne prend pas, on peut le RENDRE — et rendre, ici, est un rite : la chose rendue est portée à la chapelle, on lui dit adieu À VOIX HAUTE, et le mur des adieux l'accueille. Si le héros rend SA chose perdue en jouant l'adieu pour de vrai (la scène est écrite pour être jouée au micro, sans jet — le MJ écoute, c'est tout), c'est un ADIEU LIBREMENT CONSENTI : la répétition générale de la faiblesse nº 2, et il compte comme GAGE UNIVERSEL au final. La Dame Dépareillée, qui n'a rien montré de tout l'acte, retire alors UN gant — sa seule marque de respect connue. Trouvère note la scène en chanson. Même les murs se taisent pour écouter.",
        location: 'Le Revers — la chapelle des adieux',
        mood: 'dramatic',
      },
      {
        id: '15d',
        title: 'La sortie du Revers',
        description:
          "La haie-frontière s'ouvre sur le chemin du retour. Le Majordome rend au héros une chose que personne n'avait payée : LE SALUT d'un inconnu — « quelqu'un vous a salué un jour, et vous ne l'avez pas vu ; c'est tombé ici ; la Cour paie ses dettes » (petit, gratuit, bouleversant — le style de la maison). Si le nom de Brindille fut retrouvé : la scène de la QUESTION (« demande-moi d'abord si je le veux ») se joue ici, à la frontière, entre deux mondes — et sa réponse, quelle qu'elle soit, est à ELLE. Départ vers le Seuil — où le Métier, désormais, se voit dans TOUS les ciels. [Si {{RELIQUE_DEPLACEE}} = la Voix : la chapelle est VIDE au Ch15a — le Ravaudeur l'a troquée à la Regrattière contre un souvenir volé ; la piste écrite raccourcit l'acte et jette le héros au Ch16 en avance, furieux, et la Cour AVEC lui.]",
        location: 'Le Revers — la haie-frontière, le chemin du retour',
        mood: 'exploration',
      },
    ],
    encounters: [
      {
        type: 'roleplay',
        description:
          "L'inventaire devant la Cour : chaque option a sa scène d'essai (tenir la Voix — elle pèse le poids exact de tous ses adieux ; tenir sa chose perdue — elle est si légère ; lire le nom de Brindille — il sonne comme une porte qui s'ouvre). La Cour répond à toutes les questions SANS mentir (les conséquences de chaque choix sont énoncées, y compris « ROUVRIR se fermera »). Le compagnon présent a son mot écrit — et Brindille, si son nom est sur la table, ne dit RIEN : elle regarde le héros faire, et c'est le pire.",
        difficulty: 'hard',
        monsters: [],
        reward: "La chose choisie — et tout ce que le rendu aura tissé (gages, respect de la Cour, chansons de Trouvère).",
      },
      {
        type: 'combat',
        description:
          "Variante Ravaudeur (si la Voix fut volée) : la Regrattière, en cavale avec le troc du Ravaudeur, se terre dans la forêt des parapluies avec ses épouvantails de manteaux et un licorne CAPTURÉ (attelé à sa charrette — le scandale absolu aux yeux du plan). La Cour prête main-forte ouvertement. Récupérer la Voix ici la rend « éraflée » : elle fonctionne, mais son premier usage au Chas aura un accroc écrit.",
        difficulty: 'deadly',
        monsters: ['green_hag', 'unicorn', 'satyr', 'dryad'],
        reward: "La Voix (éraflée) — et la certitude que le Ravaudeur PRÉPARE quelque chose au Seuil qui vaut de troquer un organe de dieu.",
      },
    ],
    branchingChoices: [
      {
        decision: "LA chose retrouvée (loi 4 — une seule sort du Revers) :",
        optionA:
          "LA VOIX DE VANTAEL (la campagne d'abord : ROUVRIR et le Raccommodage restent ouverts — mais sa chose perdue reste au mur des adieux, et le nom de Brindille dans les registres).",
        optionB:
          "SA CHOSE PERDUE ou LE NOM DE BRINDILLE (le cœur d'abord : un choix inoubliable — mais la Voix reste à la Cour : ROUVRIR SE FERME, et la fin 3 passe en variante « dieu muet », écrite).",
        consequence:
          "A : canonFact « La Voix emportée » (+ « chose perdue rendue en adieu » si le rite fut joué — gage universel). B : canonFact « La Voix laissée à la Cour » — le Chas se jouera sans le mot d'adieu originel ; la Cour promet de la GARDER « pour quand le monde reviendra la chercher poliment ». PERSISTER impérativement — c'est le levier des fins.",
      },
      {
        decision: "Le salut rendu par le Majordome — le rendre à SON tour un jour ?",
        optionA:
          "Promettre de le rendre (saluer, quelque part, quelqu'un qui ne vous verra pas — une promesse minuscule que le MJ notera et fera tomber à un moment parfait des épilogues).",
        optionB:
          "Le garder (un salut à soi, pour les mauvais jours — le Majordome approuve aussi : « les dettes gardées au chaud sont des dettes quand même »).",
        consequence:
          "A : une vignette d'épilogue supplémentaire, écrite, où le salut rendu boucle la boucle. B : rien — et c'est un droit. PERSISTER : canonFact « Salut à rendre » (A) ou rien (B).",
      },
    ],
    cliffhanger:
      "Sur le chemin du retour, le ciel du Revers — le seul ciel que la Trame n'avait jamais touché — se raye d'un fil gris, très haut, comme une première ride. La Dame Dépareillée le regarde depuis son balcon d'objets, retire son SECOND gant — jamais vu, même de Trouvère — et dit à la cantonade : « Faites vite, la porte-qui-marche. Quand il ne restera qu'un seul ciel, même l'oubli n'aura plus d'ailleurs. » [La Couture +1 (tic de clôture d'acte). Palier 7 en approche : le Métier s'active. Le Seuil appelle — tout converge.]",
  },
];
