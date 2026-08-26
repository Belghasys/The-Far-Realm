import { AdventureManifest } from '../../../types/index';

/**
 * LES PORTES DE L'EXIL — ACTE VI : « Le Grand Métier » (ch. 16-18, niv. 15-16)
 * Le retour au Seuil en crise, la bataille contre le Ravaudeur, l'assemblage
 * du dieu — puis le Métier (trois zones, trois retrouvailles armées) et le
 * Chas : le final scripté, les trois faiblesses, les quatre fins.
 * Ton : le retour, l'atelier, le chas de l'aiguille.
 */
export const PE_ACT_VI: AdventureManifest['chapters'] = [
  {
    id: '16',
    title: 'Le Retour au Seuil',
    act: 'Acte VI — Le Grand Métier',
    objective:
      "L'Entre-Seuil — traverser la ville au bord de la guerre civile, démasquer le traître, briser le Ravaudeur, assembler le dieu — et recevoir la dernière offre.",
    status: 'pending',
    scenes: [
      {
        id: '16a',
        title: 'La ville sous le Métier',
        description:
          "L'Entre-Seuil au palier 7 : LE GRAND MÉTIER est visible dans tous les ciels — une architecture de fils d'or tendue entre les mondes, cadre céleste où la Trame Grise se tisse à vue d'œil. La ville est au bord de la guerre civile : les Combleurs n'ont JAMAIS été si aimés (ils logent la moitié du Seuil) ni si craints ; les Lamaneurs font grève du tampon (« on ne pilote pas des portes qu'on SOUDE ») ; le Cortège a fermé les Veines ; la Franchise vend des places de canot de sauvetage vers « n'importe où tant que c'est ailleurs ». Brochet, débordé, applique le règlement des heures sombres : il tamponne tout, en pleurant. Et sur la Place du Cœur-Tu, le battement rendu s'est fait TAMBOUR — la carcasse, organe après organe, se souvient qu'elle fut un dieu.",
        location: 'L’Entre-Seuil — la ville sous le Métier',
        mood: 'tension',
      },
      {
        id: '16b',
        title: 'Le verrou du traître',
        description:
          "Verrou DUR du démasquage : les preuves s'imposent d'elles-mêmes — le décompte de Séverin (Ch12) contenait un détail que seul le premier cercle connaissait, et la mémoire du héros a eu trois chapitres pour le cerner. La scène est écrite par candidat : MILLE-CLÉS, s'il est le traître, ne nie pas — il ouvre sa remise : un mur ENTIER de clefs impossibles, son prix, « des portes que personne d'autre n'ouvrira jamais… tu comprends, toi, ce que ça vaut » — et il pleure en vendant son dernier mensonge. SŒUR ORAISON, si c'est elle, rend son rite « corrigé » d'elle-même, à genoux dans la crypte : « le deuil du dieu devait FINIR. Il m'a promis la fin du deuil, petit. À moi. La chevalière du deuil. » — et sa chute est la plus douce et la plus terrible. Dans les deux cas : que FAIRE du traître est un choix, pas un script.",
        location: 'L’Entre-Seuil — la remise / la crypte',
        mood: 'dramatic',
      },
      {
        id: '16c',
        title: 'La bataille du Seuil',
        description:
          "Le RAVAUDEUR frappe — il veut coudre AVANT le maître, sale et vite : ses Agrafés déferlent des quais pour souder la ville aux mondes voisins en UNE nuit (« pourquoi broder pendant des siècles ? ON AGRAFE, et c'est réglé »). C'est la bataille rangée de la campagne — et le paiement de six actes d'alliances : les Lamaneurs tiennent les guichets en phalange administrative, la Franchise mine ses propres entrepôts, le Cortège ouvre les Veines en couloirs d'évacuation, la machine de guerre rachetée tonne si elle fut gagnée, Cendrelin-la-factrice charge si elle fut rachetée, les Émondeurs taillent si la dette de sang fut prise. Au centre : COLIN GROSGRAIN, le Ravaudeur — enfin un ennemi qu'on peut COMBATTRE, agrafeuse-espadon au poing, vulgaire, rapide, et blessé d'avance : Séverin ne l'a jamais trouvé digne, et ça s'entend dans chaque coup.",
        location: 'L’Entre-Seuil — les quais, bataille rangée',
        mood: 'combat_boss',
      },
      {
        id: '16d',
        title: 'L’assemblage et la dernière offre',
        description:
          "Dans la carcasse apaisée, les derniers organes rejoignent leurs places (l'Œil et le Cœur, déposés aux interludes, S'ÉVEILLENT — toujours liés au héros) — et à l'ASSEMBLAGE COMPLET, quatre visions d'un coup : la mort de Vantael VUE PAR VANTAEL. L'Œil : il a VU Séverin venir, l'Aiguille à la main, et n'a pas fermé ses portes. Le Cœur : il a eu peur, et a choisi quand même. Le Pas : il aurait pu fuir — un dieu des seuils fuit comme il respire — il est RESTÉ. La Voix (si emportée) : il a préparé un dernier mot, et l'a retenu — pour que son Portier ait, enfin, QUELQUE CHOSE À QUITTER. Le dieu des adieux a offert sa mort en cadeau d'adieu. Séverin ne l'a jamais compris. Et il est LÀ, au seuil de la crypte — il n'entre pas (la vieille loi) — et il fait sa dernière offre, colorée par {{VISAGE}}, la seule qu'il n'ait jamais faite à personne : « Je ne vous demande plus de me suivre. Je vous demande de me REMPLACER. »",
        location: 'L’Entre-Seuil — la crypte de la carcasse',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "LE RAVAUDEUR (profil écrit — un vrai boss combattable : brute véloce à l'agrafeuse-espadon, il SOUDE le terrain en arènes mouvantes et s'agrafe LUI-MÊME ses blessures en plein combat, de travers, en jurant). Ses Agrafés grincent en vagues. Le rite du seuil tracé ne l'arrête PAS (il n'a jamais été Portier — c'est sa fierté et sa faille : aucune loi ne le tient, aucune ne le protège). L'Agrafeuse brisée est la récompense — et sa chute a un témoin : Séverin, au balcon, qui regarde son élève répudié tomber SANS un mot, et recoud les dégâts avant même la fin du combat.",
        difficulty: 'deadly',
        monsters: ['flesh_golem', 'clay_golem', 'chain_devil', 'veteran'],
        reward: "L'Agrafeuse brisée (voir table des récompenses) — et le champ libre : il ne reste qu'UN couturier.",
      },
      {
        type: 'roleplay',
        description:
          "La dernière offre (l'arbre final, 3 tours, écrit par visage — staging volume 3c) : Séverin à découvert, sincère, épuisé d'une fatigue de quatre siècles qu'il montre pour la première fois. Il offre l'Aiguille, le Registre, la charge — et répond à TOUT (c'est l'unique scène où poser n'importe quelle question de la campagne obtient une réponse vraie). Le refus doit être GAGNÉ : un argument neuf, sincère, lié au voyage VÉCU (le Val, le Cœur apaisé, la stèle, l'adieu joué). La graine-créance de Vert-Sépulcre, si acquise, s'utilise ICI (une exigence qu'il honorera). En cas d'acceptation : la fin « Reprendre le Fil » s'ouvre PAR ANTICIPATION — et le Ch17-18 se rejoue en passation, variante écrite.",
        difficulty: 'hard',
        monsters: [],
        reward: "Selon l'issue : le respect définitif de l'Ourdisseur — ou son Aiguille. Les deux se paieront.",
      },
    ],
    branchingChoices: [
      {
        decision: "Le sort du traître démasqué :",
        optionA:
          "Le juger devant sa faction (la ville en a besoin : le procès est une scène — Brochet préside au règlement, la sentence appartient aux siens, et le héros témoigne ; dur, public, JUSTE).",
        optionB:
          "L'employer contre Séverin (le traître connaît l'intérieur des Combleurs : le retourner ouvre un accès au Métier — mais confier sa flanc-garde à qui a déjà vendu une fois est un pari, écrit avec sa probabilité de seconde trahison).",
        consequence:
          "A : canonFact « [Traître] jugé par les siens » — le premier cercle purgé, la ville respire. B : canonFact « [Traître] retourné » — un guide intérieur au Ch17 (une zone du Métier s'aborde par sa porte de service) mais le MJ tient le dé de la rechute. PERSISTER impérativement.",
      },
      {
        decision: "La dernière offre — la réponse du héros :",
        optionA:
          "REFUSER (gagné en arbre social : la campagne file vers le Métier et le Chas — Séverin s'incline, « alors finissons-en proprement. Vous connaissez le chemin : c'est celui que vous tissez depuis le début. »).",
        optionB:
          "ACCEPTER — ou faire mine (la passation s'amorce : Séverin commence la TRANSMISSION — trois leçons de couture cosmique, écrites — et la fin 4 se joue par anticipation… sauf retournement du héros à la dernière leçon, variante écrite : la trahison du successeur, la seule chose qu'il n'a JAMAIS prévue).",
        consequence:
          "A : voie standard vers Ch17-18. B : voie de la passation (Ch17 devient l'atelier vu de L'INTÉRIEUR ; le Chas se joue en héritier — et chaque fin reste atteignable, mais par des scènes miroirs). PERSISTER : canonFact « Offre refusée » (A) ou « Passation acceptée [sincère/feinte au choix du joueur] » (B).",
      },
    ],
    cliffhanger:
      "À minuit, le Métier s'ABAISSE — son cadre céleste descend d'un cran vers la ville, et tous les fils du monde se tendent d'un coup, comme un métier qu'on arme. Dans le silence qui suit, chaque habitant du Seuil entend distinctement, PAR les fils, un bruit venu de partout : une aiguille qu'on enfile. Séverin, quelque part, a commencé le Grand Raccord. [La Couture 8/8 si non retenue par le Pas — sinon 7/8 et une nuit de marge. Le Ch17 commence : le Métier attend.]",
  },
  {
    id: '17',
    title: 'Le Grand Métier',
    act: 'Acte VI — Le Grand Métier',
    objective:
      "Le Grand Métier — monter dans l'atelier du monde, découdre trois zones cousues de trois mondes, et reprendre {{COUSU}} à la Trame — ici ou jamais.",
    status: 'pending',
    scenes: [
      {
        id: '17a',
        title: 'La montée au Métier',
        description:
          "On monte au Métier par les fils — littéralement : les Veines du Mort, ouvertes en grand par le Cortège, débouchent sur le CADRE, et l'on marche sur des câbles d'or larges comme des ponts, au-dessus de tous les ciels à la fois (vertige écrit : chaque regard vers le bas montre un monde DIFFÉRENT). L'atelier est immense et domestique à la fois — établis grands comme des places, bobines hautes comme des tours, et partout la marque d'un artisan soigneux : outils rangés, chutes pliées, un tablier accroché à un clou. Trois ZONES actives barrent la route du Chas : trois pièces des mondes traversés, cousues au Métier comme des échantillons vivants — le patron y répète ses points avant le Grand Raccord.",
        location: 'Le Grand Métier — le cadre, les établis',
        mood: 'dungeon',
      },
      {
        id: '17b',
        title: 'Les trois zones (échantillons vivants)',
        description:
          "Par défaut : UNE RUELLE DU VAL sous vendanges éternelles (les habitants-échantillons lèvent leurs verres à la santé du héros — certains le RECONNAISSENT : « Aubin ! ») ; UNE NEF DE VERT-SÉPULCRE en fleur (la sève noire domestiquée coule en fontaines décoratives — la forêt captive appelle le porteur du Cœur d'une voix de feuilles) ; UNE TRANCHÉE DE LA MARCHE qui tonne encore (des soldats-échantillons se battent en boucle, huit secondes de guerre re-cousues à l'infini — l'obscénité absolue au regard de la stèle). Chaque zone = UNE scène et UN geste décisif de décousure (pas un donjon) : trouver le POINT-MÈRE de l'échantillon (l'Œil le voit), y dépenser un GAGE D'ADIEU en jouant l'adieu correspondant — et la zone se défait, ses captifs libérés, pendant que LES ALLIÉS DE L'ACTE CORRESPONDANT rejoignent par la déchirure (Perrette et le Veneur pour le Val ; l'Abbé et le guide survivant pour la forêt ; Sorrel — ou Cendrelin-factrice — pour la Marche). [Si {{PORTE_NATALE}} = « déjà cousue dans le Métier » : la porte natale du héros REMPLACE une zone — la découdre, c'est renoncer à rentrer, et c'est écrit.]",
        location: 'Le Grand Métier — les trois zones',
        mood: 'dramatic',
      },
      {
        id: '17c',
        title: '{{COUSU}} dans la Trame',
        description:
          "Dans la deuxième zone décousue (ou la plus chargée d'alliés), la Trame montre son ouvrage le plus récent : {{COUSU}}, cousu VIVANT dans la doublure du monde — bordé, souriant, tenant sa place dans un décor qui n'est pas le sien (Halvard pilote une porte qui n'ouvre sur rien ; Isaure dresse la carte d'un pays qui n'existe pas). Il ne souffre PAS. C'est pire. Brindille, navette usée, SAIT : « c'est ici ou jamais — au Chas, il sera tissé trop profond. On ne découd pas quelqu'un du motif central. » La décousure de {{COUSU}} est une scène à part entière : le NOMMER (tout son nom, tout ce qu'on sait de lui — le jeu de mémoire de toute la campagne), tenir sa main pendant que les fils lâchent, et ENCAISSER son réveil (il a tout senti, de très loin, « comme un bonheur qu'on m'aurait cousu par-dessus la bouche »).",
        location: 'Le Grand Métier — la doublure de la Trame',
        mood: 'dramatic',
      },
      {
        id: '17d',
        title: 'Le seuil du Chas',
        description:
          "Les zones défaites, le Métier s'ouvre sur son centre : LE CHAS — l'œil de l'aiguille originelle, dressée comme un menhir de nacre au cœur de l'atelier, par lequel TOUS les fils du monde passent. Devant : un seuil. Un vrai, un simple seuil de pierre usée — LE seuil, celui que Séverin a gardé toute sa vie, arraché à son monde mort et remonté ici, marche par marche. Il attend derrière, à contre-jour de tous les ciels. Il a mis son tablier. « Vous avez décousu proprement, dit-il sans se retourner. Je le savais. Entrez — moi, vous savez bien : je ne peux pas. J'ai jamais pu. » [Transition immédiate au Ch18 — le final est UNE continuité.]",
        location: 'Le Grand Métier — le seuil du Chas',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "Chaque zone a sa GARDE avant le point-mère : les Cousus d'élite du motif (golems de chair au fil d'or triple, gardien-bouclier portant les échantillons comme des reliques, traqueurs invisibles qui sont des FILS animés — on les voit par l'Œil seulement). Un gage dépensé au bon moment fait TAIRE une vague entière (la faiblesse nº 2 en mécanique de bataille) ; l'Agrafeuse brisée fait hésiter ; le Sécateur tranche ce qui voudrait se recoudre.",
        difficulty: 'deadly',
        monsters: ['flesh_golem', 'shield_guardian', 'invisible_stalker', 'stone_golem'],
        reward: "Par zone décousue : ses captifs libérés + les alliés de l'acte au Chas (les adieux joués reviennent en PRÉSENCES — mais le gage dépensé l'est pour de bon : il ne comptera plus au Chas).",
      },
      {
        type: 'roleplay',
        description:
          "Les retrouvailles armées : chaque vague d'alliés arrive avec sa scène courte écrite (Perrette qui brandit son bâton de décompte « il COMPTE encore ! », l'Abbé qui taille son premier fil d'or « ça repousse ? — non ? PARFAIT. », Sorrel qui distribue le courrier EN PLEIN combat « c'est le moment ou jamais, tout le monde est là »). Le Métier n'est pas un donjon : c'est le paiement de toutes les relations — le MJ fait l'appel des vivants, et chaque absent PÈSE.",
        difficulty: 'medium',
        monsters: [],
        reward: "L'armée des adieux — ceux qui restent quand on a su partir. Ils tiendront le Métier pendant le Chas.",
      },
    ],
    branchingChoices: [
      {
        decision: "L'ordre des zones (le joueur choisit — et l'ordre PARLE) :",
        optionA:
          "Commencer par la zone de {{COUSU}} (le cœur d'abord : le sauver AVANT tout — mais les deux autres zones, alertées, renforcent leurs gardes : les combats suivants durcissent d'un cran).",
        optionB:
          "Garder {{COUSU}} pour la fin (la stratégie d'abord : deux vagues d'alliés déjà là pour l'assaut le plus dur — mais deux scènes durant, on COMBAT en le sachant cousu à cent pas).",
        consequence:
          "A : sauvetage immédiat, difficulté croissante — et {{COUSU}}, réveillé, se BAT aux côtés du héros pour les zones restantes (il y tient : « on m'a cousu une place. Je viens découdre les leurs. »). B : montée en puissance tactique, poids moral écrit. PERSISTER : canonFact « Ordre des zones : [choix] ».",
      },
      {
        decision: "Si {{PORTE_NATALE}} est une zone : la découdre ?",
        optionA:
          "La découdre comme les autres (le Métier s'affaiblit d'autant — mais la porte natale se défait AVEC le motif : le héros renonce à rentrer, définitivement, et l'Ancre marque 6 d'office ; la scène est écrite pour être injouable sans un silence).",
        optionB:
          "L'épargner et contourner (le Chas s'ouvre quand même — mais un pan du Métier reste armé : la vague finale du Ch18 en sera plus lourde, et Séverin SAURA ce que le héros n'a pas pu trancher : « vous voyez. On garde tous une pièce. »),",
        consequence:
          "A : canonFact « Porte natale décousue — plus de retour » (les épilogues changent : le héros est d'ICI désormais). B : canonFact « Porte natale épargnée dans le Métier » — Séverin gagne son dernier argument, et le Chas s'ouvre là-dessus. PERSISTER impérativement.",
      },
    ],
    cliffhanger:
      "Au moment de franchir le seuil du Chas, tous les fils du Métier — des milliards — se tendent vers le héros comme des aiguilles de boussole. Pas hostiles : ATTENTIFS. La Navette entre dans le Chas ; c'est la fin pour laquelle l'atelier entier fut bâti, et l'atelier le sait. Derrière, la voix de Séverin, presque tendre : « Doucement, avec eux. Ils n'ont jamais vu passer quelqu'un de LIBRE. » [Le Ch18 commence de plain-pied.]",
  },
  {
    id: '18',
    title: 'Le Chas',
    act: 'Acte VI — Le Grand Métier',
    objective:
      "Le Chas — poser les trois faiblesses, entendre la dernière défense de l'Ourdisseur, et choisir la fin du monde des portes. (Le final scripté : voir volume Endings — séquence temps par temps.)",
    status: 'pending',
    scenes: [
      {
        id: '18a',
        title: 'Le rite au seuil (faiblesse nº 3)',
        description:
          "TEMPS 1 du final : le Chas est une rotonde de nacre où l'Aiguille originelle se dresse, enfilée de tous les fils du monde ; la carcasse assemblée de Vantael affleure sous le sol translucide, comme un dormeur sous la glace. Séverin reste au seuil — sa loi. Tracer le RITE DE VANTAEL (la version complète du rite d'Oraison — apprise d'elle, ou de la crypte, ou du Majordome) autour du seuil qu'il a remonté ici LE CLOUE : debout, dehors, devant la porte — la place qu'il a tenue toute sa vie, rendue OBLIGATOIRE. C'est le premier point gagné, et le plus cruel : on ne l'exile pas ; on le RANGE.",
        location: 'Le Chas — le seuil de Séverin',
        mood: 'dramatic',
      },
      {
        id: '18b',
        title: 'La page manquante (faiblesse nº 1)',
        description:
          "TEMPS 2-3 : l'offre finale (dernier tour de l'arbre, coloré par {{VISAGE}}) — puis LA LECTURE. La page manquante du Registre des Adieux, reconstituée des quatre indices (le nom gratté, la stèle des Émondeurs, le reçu de la Marche, le récit du Majordome), lue à voix haute — par le héros, ou par le Majordome-témoin s'il fut invité. Le texte EXACT est au volume Endings : l'adieu que Séverin n'a pas dit, écrit à la forme exacte du Registre qu'il a tenu toute sa vie pour les autres. Il est FORCÉ de l'écouter (c'est sa loi de Portier : un adieu déclaré au seuil DOIT être enregistré). C'est ici qu'on peut lui jeter son mensonge (« je n'ai jamais rien détruit ») et la vision du Ch16 — la seule fois de la campagne où Séverin CRIE.",
        location: 'Le Chas — face au seuil',
        mood: 'dramatic',
      },
      {
        id: '18c',
        title: 'Les gages (faiblesse nº 2) et la dernière vague',
        description:
          "TEMPS 4 : le Métier, décapité de son maître cloué, se défend SEUL — la dernière vague de Cousus, chiffrée au volume Endings (vagues et DC). Chaque GAGE encore détenu, dépensé en jouant l'adieu correspondant, fait TAIRE une vague entière (le fanal de Brindille, la patente d'Halvard, le miroir d'Ysold, les lettres de Sorrel, le legs du guide, l'adieu déjà joué du Revers…). C'est l'inventaire final des relations : le MJ fait les comptes à voix haute, et chaque gage dépensé est une scène de dix secondes qui pèse une campagne.",
        location: 'Le Chas — la rotonde, dernière vague',
        mood: 'combat_boss',
      },
      {
        id: '18d',
        title: 'Le choix',
        description:
          "TEMPS 5 : le silence. L'Aiguille attend. La carcasse affleure. Séverin, cloué à son seuil, regarde — il ne peut plus RIEN, sauf la seule chose qu'il ait jamais bien faite : assister à un départ. Les quatre fins s'ouvrent (chacune scriptée en vignettes nominatives au volume Endings) : ROUVRIR (les 4 organes + le rite du Cortège — Vantael respire, les adieux reviennent, et Brindille retrouve son nom, donc son monde, donc tu la perds) ; DÉCOUDRE (brûler le Patron sans dieu — la liberté sauvage, le Seuil qui agonise, Brindille qui reste) ; LE RACCOMMODAGE (conditions canoniques : le Val a choisi + un commandant racheté ou la stèle lue + la Voix prise + ≥3 gages détenus au Chas — le dieu boiteux des coutures consenties) ; REPRENDRE LE FIL (jamais proposée — prendre l'Aiguille : le nouvel Arbitre, la vieille loi, et Séverin qui s'incline : « enfin quelqu'un qui comprend »).",
        location: 'Le Chas — l’Aiguille',
        mood: 'dramatic',
      },
    ],
    encounters: [
      {
        type: 'combat',
        description:
          "La dernière vague (temps 4) : le Métier orphelin jette tout — Cousus d'élite, golems d'établi, fils vivants en nuées. SANS gages : trois vagues pleines (le combat le plus dur de la campagne). AVEC gages : chaque adieu joué éteint une vague — un final à SIX gages se joue presque sans un coup, dans un Métier qui se tait morceau par morceau, et c'est la récompense méritée de six actes d'attachements. (Chiffres, vagues et DC : volume Endings.)",
        difficulty: 'deadly',
        monsters: ['flesh_golem', 'clay_golem', 'stone_golem', 'shield_guardian', 'invisible_stalker'],
        reward: "Le silence du Métier — et le temps 5 : le choix, sans personne pour le presser.",
      },
      {
        type: 'roleplay',
        description:
          "La dernière défense de Séverin (entre les temps 3 et 4 — il plaide, cloué, calme) : les chiffres vrais des Combleurs, la nuit des grillons, le vote du Val s'il fut clos, les réfugiés heureux — tout ce que la campagne a montré de VRAI dans son œuvre, une dernière fois, sans mensonge. L'arbre est écrit. Le joueur qui vacille PEUT basculer (les fins restent toutes ouvertes jusqu'au geste). C'est voulu : une campagne sur les adieux se doit de rendre le sien difficile.",
        difficulty: 'hard',
        monsters: [],
        reward: "La certitude, dans un sens ou l'autre. Puis le geste.",
      },
    ],
    branchingChoices: [
      {
        decision: "LA FIN (le geste au Chas) :",
        optionA:
          "ROUVRIR ou LE RACCOMMODAGE (selon conditions — les voies du dieu : les seuils reviennent, entiers ou consentis ; les adieux nominatifs se jouent, dont celui de Brindille si Rouvrir ; Séverin passe son seuil — dans un sens ou dans l'autre).",
        optionB:
          "DÉCOUDRE ou REPRENDRE LE FIL (les voies sans dieu : la décousure sauvage et ses morts nommés — ou l'Aiguille en main, la charge héritée, le Registre transmis, et le MJ qui ouvre le registre des prix).",
        consequence:
          "Chaque fin déroule ses vignettes scriptées (volume Endings) : morts et survivants NOMMÉS, inversés d'une fin à l'autre ; épilogues par faction, par plan, par récurrent ; le sort du héros selon l'Ancre. PERSISTER : canonFact « FIN : [nom de la fin] » — puis jouer l'épilogue aussi longtemps que le joueur le souhaite.",
      },
      {
        decision: "Séverin, après le geste (toutes fins sauf Reprendre le Fil) :",
        optionA:
          "Lui accorder le PASSAGE (Rouvrir/Raccommodage : Vantael lui ouvre l'autre côté de son seuil — l'adieu qu'on ne lui a jamais accordé ; Découdre : le laisser partir dans les mondes libres, un artisan sans ouvrage, avec son tablier et son registre).",
        optionB:
          "Le garder AU seuil (gardien pénitent des portes revenues — ou des décombres : il accepte SA place, celle de toujours, mais choisie cette fois ; les épilogues le montrent, des années plus tard, tamponnant des passages, célèbre et anonyme).",
        consequence:
          "A ou B colore l'épilogue final — aucun n'est « le bon » : l'un est un pardon, l'autre une peine juste, et la campagne a passé dix-huit chapitres à rendre les deux défendables. PERSISTER : canonFact « Séverin : [passage/seuil] ».",
      },
    ],
    cliffhanger:
      "— (Pas de cliffhanger : le Ch18 se termine par les épilogues de la fin choisie — voir volume Endings. La dernière image, quelle que soit la fin, appartient à une porte : ouverte, fermée, gardée ou franchie. Le MJ la décrit en dernier, et laisse le silence faire le reste.)",
  },
];
