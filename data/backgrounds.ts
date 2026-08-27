// Bilingue (2026-08-27) : les clés (« Acolyte », « Urchin »…) et le texte
// français restent la DONNÉE — ils voyagent dans les sauvegardes et partent au
// MJ. Les champs `*En` sont un miroir d'AFFICHAGE lu par bgDesc / bgFeature /
// bgIdeals… (data/labels.ts) : avant, un joueur en anglais lisait des idéaux,
// liens et défauts entièrement français dans la création de personnage.
export const BACKGROUNDS: Record<string, {
    desc: string;
    descEn: string;
    profs: string[];
    tools?: string[];
    languages?: number;            // number of extra languages of the player's choice
    feature: { name: string; nameEn: string; description: string; descriptionEn: string };
    // Short curated suggestion tables (SRD-style) — used as quick-pick chips at
    // creation. The player can pick one or write their own.
    ideals?: string[];
    idealsEn?: string[];
    bonds?: string[];
    bondsEn?: string[];
    flaws?: string[];
    flawsEn?: string[];
}> = {
    "Acolyte": {
        desc: "Vous avez passé votre vie au service d'un temple.",
        descEn: "You have spent your life in the service of a temple.",
        profs: ["Insight", "Religion"], languages: 2,
        feature: { name: "Abri des fidèles", nameEn: "Shelter of the Faithful", description: "Vous et vos compagnons recevez soins et soutien dans les temples de votre foi.", descriptionEn: "You and your companions receive care and support at temples of your faith." },
        ideals: ["Foi : ma divinité guide chacun de mes actes.", "Charité : j'aide les nécessiteux, quel qu'en soit le prix.", "Tradition : les rites anciens doivent être préservés."],
        idealsEn: ["Faith: my deity guides everything I do.", "Charity: I help those in need, whatever the cost.", "Tradition: the ancient rites must be preserved."],
        bonds: ["Je mourrais pour récupérer une relique sacrée volée.", "Je dois protéger le temple qui m'a élevé.", "Un prêtre mentor attend mon retour."],
        bondsEn: ["I would die to recover a stolen holy relic.", "I must protect the temple that raised me.", "A mentor priest is waiting for my return."],
        flaws: ["Je fais aveuglément confiance à mon clergé.", "Je juge durement ceux d'une autre foi.", "Un secret coupable ronge ma piété."],
        flawsEn: ["I trust my clergy blindly.", "I judge those of another faith harshly.", "A guilty secret eats away at my piety."],
    },
    "Criminal": {
        desc: "Vous avez un passé de criminel ou de contrebandier.",
        descEn: "You have a past as a criminal or a smuggler.",
        profs: ["Deception", "Stealth"], tools: ["Thieves' Tools", "Gaming Set"],
        feature: { name: "Contact criminel", nameEn: "Criminal Contact", description: "Vous avez un contact fiable au sein d'un réseau de malfrats.", descriptionEn: "You have a reliable contact inside a network of criminals." },
        ideals: ["Honneur : je ne trahis jamais un complice.", "Liberté : aucune chaîne, aucune loi ne me retient.", "Cupidité : tout a un prix, et je l'encaisse."],
        idealsEn: ["Honor: I never betray an accomplice.", "Freedom: no chain and no law holds me.", "Greed: everything has a price, and I collect it."],
        bonds: ["Je dois rembourser une dette à un parrain du crime.", "Un coup a mal tourné ; je dois réparer.", "Ma famille ignore tout de ma double vie."],
        bondsEn: ["I owe a debt to a crime boss.", "A job went wrong; I have to make it right.", "My family knows nothing of my double life."],
        flaws: ["Je ne résiste jamais à un trésor mal gardé.", "Je fuis dès que ça tourne mal.", "Je mens même quand c'est inutile."],
        flawsEn: ["I can never resist a poorly guarded treasure.", "I run the moment things go wrong.", "I lie even when there is no point."],
    },
    "Folk Hero": {
        desc: "Vous venez d'un milieu humble et êtes un héros du peuple.",
        descEn: "You come from a humble background and are a hero to the common folk.",
        profs: ["Animal Handling", "Survival"], tools: ["Artisan's Tools", "Vehicles (Land)"],
        feature: { name: "Hospitalité rustique", nameEn: "Rustic Hospitality", description: "Les gens du peuple vous offrent gîte et refuge.", descriptionEn: "Common folk offer you shelter and a place to hide." },
        ideals: ["Justice : les puissants ne doivent pas écraser les faibles.", "Sincérité : je ne prétends jamais être autre que moi-même.", "Espoir : je donne l'exemple."],
        idealsEn: ["Justice: the powerful must not crush the weak.", "Sincerity: I never pretend to be anyone but myself.", "Hope: I lead by example."],
        bonds: ["Je défendrai mon village natal jusqu'à la mort.", "Un tyran local a tout pris à ma famille.", "Mes outils de travail me sont sacrés."],
        bondsEn: ["I will defend my home village to the death.", "A local tyrant took everything from my family.", "My working tools are sacred to me."],
        flaws: ["Je crois trop vite aux causes perdues.", "Je méprise la noblesse, à tort ou à raison.", "L'orgueil de ma renommée me perdra."],
        flawsEn: ["I believe in lost causes far too quickly.", "I despise the nobility, rightly or not.", "The pride of my fame will be my undoing."],
    },
    "Noble": {
        desc: "Vous êtes né dans une famille noble et privilégiée.",
        descEn: "You were born into a noble and privileged family.",
        profs: ["History", "Persuasion"], tools: ["Gaming Set"], languages: 1,
        feature: { name: "Position de privilège", nameEn: "Position of Privilege", description: "On vous accueille dans la haute société ; le petit peuple vous accorde le bénéfice du doute.", descriptionEn: "High society welcomes you; common folk give you the benefit of the doubt." },
        ideals: ["Noblesse oblige : mon rang impose des devoirs.", "Pouvoir : je gravirai les échelons.", "Famille : le sang et le nom passent avant tout."],
        idealsEn: ["Noblesse oblige: my rank imposes duties.", "Power: I will climb the ranks.", "Family: blood and name come before all else."],
        bonds: ["Je suis loyal à ma maison avant tout.", "Une dette d'honneur me lie à un rival.", "Le petit peuple de mes terres dépend de moi."],
        bondsEn: ["I am loyal to my house above all.", "A debt of honor binds me to a rival.", "The common folk of my lands depend on me."],
        flaws: ["Je crois que tout m'est dû.", "Je méprise secrètement les roturiers.", "Une intrigue de cour pourrait me détruire."],
        flawsEn: ["I believe everything is owed to me.", "I secretly despise commoners.", "A court intrigue could destroy me."],
    },
    "Sage": {
        desc: "Vous avez consacré votre vie à l'étude du savoir.",
        descEn: "You have devoted your life to the study of knowledge.",
        profs: ["Arcana", "History"], languages: 2,
        feature: { name: "Chercheur", nameEn: "Researcher", description: "Quand vous ignorez une information, vous savez généralement où et auprès de qui la trouver.", descriptionEn: "When you lack a piece of information, you usually know where and from whom to get it." },
        ideals: ["Savoir : comprendre, c'est commencer à maîtriser.", "Vérité : je traque les faits, partout.", "Logique : la raison avant l'émotion."],
        idealsEn: ["Knowledge: to understand is to begin to master.", "Truth: I hunt the facts, wherever they lead.", "Logic: reason before emotion."],
        bonds: ["Je protège une bibliothèque ou un savoir interdit.", "Mon œuvre inachevée doit voir le jour.", "Un mentor a disparu en cherchant une réponse."],
        bondsEn: ["I protect a library, or a forbidden body of knowledge.", "My unfinished work must see the light of day.", "A mentor vanished while chasing an answer."],
        flaws: ["Je me perds dans les détails et oublie le danger.", "Je crois tout savoir mieux que les autres.", "Un secret dangereux me démange de le révéler."],
        flawsEn: ["I lose myself in details and forget the danger.", "I think I know everything better than anyone else.", "A dangerous secret is burning to get out of me."],
    },
    "Soldier": {
        desc: "Vous avez servi comme soldat dans une armée.",
        descEn: "You served as a soldier in an army.",
        profs: ["Athletics", "Intimidation"], tools: ["Gaming Set", "Vehicles (Land)"],
        feature: { name: "Grade militaire", nameEn: "Military Rank", description: "Votre ancien grade impose le respect aux soldats de votre faction.", descriptionEn: "Your former rank commands respect from soldiers of your faction." },
        ideals: ["Devoir : j'obéis aux ordres, même durs.", "Honneur martial : on ne frappe pas un ennemi à terre.", "Camaraderie : mes frères d'armes avant moi."],
        idealsEn: ["Duty: I follow orders, however hard.", "Martial honor: you do not strike a fallen enemy.", "Camaraderie: my brothers-in-arms come before me."],
        bonds: ["Je donnerais ma vie pour mon unité.", "Une bataille perdue hante mes nuits.", "Je protège un camarade blessé sous ma garde."],
        bondsEn: ["I would give my life for my unit.", "A lost battle haunts my nights.", "I protect a wounded comrade in my care."],
        flaws: ["L'ennemi de jadis me rend aveugle de rage.", "J'obéis aux ordres même quand ils sont mauvais.", "Je gèle au souvenir d'un massacre."],
        flawsEn: ["The old enemy blinds me with rage.", "I obey orders even when they are wrong.", "I freeze at the memory of a massacre."],
    },
    "Urchin": {
        desc: "Vous avez grandi dans les rues, apprenant à survivre.",
        descEn: "You grew up on the streets, learning to survive.",
        profs: ["Sleight of Hand", "Stealth"], tools: ["Thieves' Tools", "Disguise Kit"],
        feature: { name: "Secrets de la ville", nameEn: "City Secrets", description: "Vous connaissez les passages cachés des cités et vous déplacez deux fois plus vite dans leurs dédales.", descriptionEn: "You know the hidden ways of cities and travel their maze twice as fast." },
        ideals: ["Solidarité : les gosses des rues s'entraident.", "Liberté : personne ne me dictera ma vie.", "Survie : on fait ce qu'il faut pour manger."],
        idealsEn: ["Solidarity: street kids look after their own.", "Freedom: nobody dictates my life to me.", "Survival: you do what it takes to eat."],
        bonds: ["Je partage tout avec les enfants des rues.", "Quelqu'un m'a sauvé jadis ; je lui dois tout.", "Un objet volé est mon seul lien au passé."],
        bondsEn: ["I share everything with the street children.", "Someone once saved me; I owe them everything.", "A stolen trinket is my only link to my past."],
        flaws: ["Je vole par réflexe, même mes alliés.", "Je me méfie de toute autorité.", "Je cache la nourriture, par vieille peur."],
        flawsEn: ["I steal by reflex, even from my allies.", "I distrust every authority.", "I hoard food, out of an old fear."],
    },
    "Charlatan": {
        desc: "Vous vivez de manipulation et de tromperie.",
        descEn: "You live by manipulation and deceit.",
        profs: ["Deception", "Sleight of Hand"], tools: ["Disguise Kit", "Forgery Kit"],
        feature: { name: "Fausse identité", nameEn: "False Identity", description: "Vous possédez une seconde identité crédible : papiers, relations, déguisements.", descriptionEn: "You have a convincing second identity: papers, contacts, disguises." },
        ideals: ["Indépendance : je ne dois rien à personne.", "Charme : un sourire ouvre toutes les portes.", "Or : l'arnaque est un art rentable."],
        idealsEn: ["Independence: I owe nothing to anyone.", "Charm: a smile opens every door.", "Gold: the con is a profitable art."],
        bonds: ["Une victime jure de me retrouver.", "Je dois entretenir un proche grâce à mes combines.", "Mon ancien complice connaît mes secrets."],
        bondsEn: ["A mark has sworn to track me down.", "My schemes support someone I love.", "My former partner knows my secrets."],
        flaws: ["Je ne peux m'empêcher d'arnaquer, même les amis.", "Je surestime mon bagou.", "Une dette de jeu me poursuit."],
        flawsEn: ["I cannot help conning people, friends included.", "I overestimate my own silver tongue.", "A gambling debt follows me everywhere."],
    },
    "Hermit": {
        desc: "Vous avez vécu en isolement, méditant sur les mystères.",
        descEn: "You lived in seclusion, meditating on the mysteries.",
        profs: ["Medicine", "Religion"], tools: ["Herbalism Kit"], languages: 1,
        feature: { name: "Découverte", nameEn: "Discovery", description: "Votre longue retraite vous a révélé un secret unique et puissant.", descriptionEn: "Your long seclusion revealed a unique and powerful secret to you." },
        ideals: ["Illumination : la vérité se trouve en soi.", "Bienveillance : aider sans rien attendre.", "Mystère : certaines connaissances doivent rester cachées."],
        idealsEn: ["Enlightenment: the truth is found within.", "Kindness: to help, expecting nothing back.", "Mystery: some knowledge must stay hidden."],
        bonds: ["Je dois protéger la découverte de ma retraite.", "Une question sans réponse a guidé mon exil.", "Je cherche celui qui m'a poussé à fuir le monde."],
        bondsEn: ["I must protect the discovery of my seclusion.", "An unanswered question drove my exile.", "I am looking for the one who drove me from the world."],
        flaws: ["Je suis coupé des usages du monde.", "Mes grandes idées sombrent parfois dans la folie.", "Je garde un secret qui pourrait tout détruire."],
        flawsEn: ["I am cut off from the ways of the world.", "My great ideas sometimes tip into madness.", "I keep a secret that could destroy everything."],
    },
    "Outlander": {
        desc: "Vous avez grandi loin de la civilisation, dans la nature.",
        descEn: "You grew up far from civilization, out in the wild.",
        profs: ["Athletics", "Survival"], tools: ["Musical Instrument"], languages: 1,
        feature: { name: "Vagabond", nameEn: "Wanderer", description: "Vous mémorisez le terrain et trouvez nourriture et eau fraîche pour le groupe en pleine nature.", descriptionEn: "You memorize terrain and can find food and fresh water for the party in the wild." },
        ideals: ["Nature : le monde sauvage doit rester libre.", "Force : seul le plus fort survit.", "Liberté : nul mur ne me retiendra."],
        idealsEn: ["Nature: the wild must remain free.", "Strength: only the strongest survive.", "Freedom: no wall will hold me."],
        bonds: ["Ma terre sauvage natale est sacrée.", "Je protège une tribu ou un clan lointain.", "Un esprit de la nature veille sur moi."],
        bondsEn: ["My native wilderness is sacred to me.", "I protect a distant tribe or clan.", "A nature spirit watches over me."],
        flaws: ["La civilisation m'étouffe et m'agace.", "Je règle tout par la force.", "Je fais une confiance naïve aux bêtes, pas aux gens."],
        flawsEn: ["Civilization stifles and irritates me.", "I settle everything by force.", "I naively trust beasts, never people."],
    }
};
