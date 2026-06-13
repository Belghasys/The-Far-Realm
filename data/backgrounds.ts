export const BACKGROUNDS: Record<string, {
    desc: string;
    profs: string[];
    tools?: string[];
    languages?: number;            // number of extra languages of the player's choice
    feature: { name: string; description: string };
    // Short curated suggestion tables (SRD-style) — used as quick-pick chips at
    // creation. The player can pick one or write their own.
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
}> = {
    "Acolyte": {
        desc: "Vous avez passé votre vie au service d'un temple.",
        profs: ["Insight", "Religion"], languages: 2,
        feature: { name: "Abri des fidèles", description: "Vous et vos compagnons recevez soins et soutien dans les temples de votre foi." },
        ideals: ["Foi : ma divinité guide chacun de mes actes.", "Charité : j'aide les nécessiteux, quel qu'en soit le prix.", "Tradition : les rites anciens doivent être préservés."],
        bonds: ["Je mourrais pour récupérer une relique sacrée volée.", "Je dois protéger le temple qui m'a élevé.", "Un prêtre mentor attend mon retour."],
        flaws: ["Je fais aveuglément confiance à mon clergé.", "Je juge durement ceux d'une autre foi.", "Un secret coupable ronge ma piété."],
    },
    "Criminal": {
        desc: "Vous avez un passé de criminel ou de contrebandier.",
        profs: ["Deception", "Stealth"], tools: ["Thieves' Tools", "Gaming Set"],
        feature: { name: "Contact criminel", description: "Vous avez un contact fiable au sein d'un réseau de malfrats." },
        ideals: ["Honneur : je ne trahis jamais un complice.", "Liberté : aucune chaîne, aucune loi ne me retient.", "Cupidité : tout a un prix, et je l'encaisse."],
        bonds: ["Je dois rembourser une dette à un parrain du crime.", "Un coup a mal tourné ; je dois réparer.", "Ma famille ignore tout de ma double vie."],
        flaws: ["Je ne résiste jamais à un trésor mal gardé.", "Je fuis dès que ça tourne mal.", "Je mens même quand c'est inutile."],
    },
    "Folk Hero": {
        desc: "Vous venez d'un milieu humble et êtes un héros du peuple.",
        profs: ["Animal Handling", "Survival"], tools: ["Artisan's Tools", "Vehicles (Land)"],
        feature: { name: "Hospitalité rustique", description: "Les gens du peuple vous offrent gîte et refuge." },
        ideals: ["Justice : les puissants ne doivent pas écraser les faibles.", "Sincérité : je ne prétends jamais être autre que moi-même.", "Espoir : je donne l'exemple."],
        bonds: ["Je défendrai mon village natal jusqu'à la mort.", "Un tyran local a tout pris à ma famille.", "Mes outils de travail me sont sacrés."],
        flaws: ["Je crois trop vite aux causes perdues.", "Je méprise la noblesse, à tort ou à raison.", "L'orgueil de ma renommée me perdra."],
    },
    "Noble": {
        desc: "Vous êtes né dans une famille noble et privilégiée.",
        profs: ["History", "Persuasion"], tools: ["Gaming Set"], languages: 1,
        feature: { name: "Position de privilège", description: "On vous accueille dans la haute société ; le petit peuple vous accorde le bénéfice du doute." },
        ideals: ["Noblesse oblige : mon rang impose des devoirs.", "Pouvoir : je gravirai les échelons.", "Famille : le sang et le nom passent avant tout."],
        bonds: ["Je suis loyal à ma maison avant tout.", "Une dette d'honneur me lie à un rival.", "Le petit peuple de mes terres dépend de moi."],
        flaws: ["Je crois que tout m'est dû.", "Je méprise secrètement les roturiers.", "Une intrigue de cour pourrait me détruire."],
    },
    "Sage": {
        desc: "Vous avez consacré votre vie à l'étude du savoir.",
        profs: ["Arcana", "History"], languages: 2,
        feature: { name: "Chercheur", description: "Quand vous ignorez une information, vous savez généralement où et auprès de qui la trouver." },
        ideals: ["Savoir : comprendre, c'est commencer à maîtriser.", "Vérité : je traque les faits, partout.", "Logique : la raison avant l'émotion."],
        bonds: ["Je protège une bibliothèque ou un savoir interdit.", "Mon œuvre inachevée doit voir le jour.", "Un mentor a disparu en cherchant une réponse."],
        flaws: ["Je me perds dans les détails et oublie le danger.", "Je crois tout savoir mieux que les autres.", "Un secret dangereux me démange de le révéler."],
    },
    "Soldier": {
        desc: "Vous avez servi comme soldat dans une armée.",
        profs: ["Athletics", "Intimidation"], tools: ["Gaming Set", "Vehicles (Land)"],
        feature: { name: "Grade militaire", description: "Votre ancien grade impose le respect aux soldats de votre faction." },
        ideals: ["Devoir : j'obéis aux ordres, même durs.", "Honneur martial : on ne frappe pas un ennemi à terre.", "Camaraderie : mes frères d'armes avant moi."],
        bonds: ["Je donnerais ma vie pour mon unité.", "Une bataille perdue hante mes nuits.", "Je protège un camarade blessé sous ma garde."],
        flaws: ["L'ennemi de jadis me rend aveugle de rage.", "J'obéis aux ordres même quand ils sont mauvais.", "Je gèle au souvenir d'un massacre."],
    },
    "Urchin": {
        desc: "Vous avez grandi dans les rues, apprenant à survivre.",
        profs: ["Sleight of Hand", "Stealth"], tools: ["Thieves' Tools", "Disguise Kit"],
        feature: { name: "Secrets de la ville", description: "Vous connaissez les passages cachés des cités et vous déplacez deux fois plus vite dans leurs dédales." },
        ideals: ["Solidarité : les gosses des rues s'entraident.", "Liberté : personne ne me dictera ma vie.", "Survie : on fait ce qu'il faut pour manger."],
        bonds: ["Je partage tout avec les enfants des rues.", "Quelqu'un m'a sauvé jadis ; je lui dois tout.", "Un objet volé est mon seul lien au passé."],
        flaws: ["Je vole par réflexe, même mes alliés.", "Je me méfie de toute autorité.", "Je cache la nourriture, par vieille peur."],
    },
    "Charlatan": {
        desc: "Vous vivez de manipulation et de tromperie.",
        profs: ["Deception", "Sleight of Hand"], tools: ["Disguise Kit", "Forgery Kit"],
        feature: { name: "Fausse identité", description: "Vous possédez une seconde identité crédible : papiers, relations, déguisements." },
        ideals: ["Indépendance : je ne dois rien à personne.", "Charme : un sourire ouvre toutes les portes.", "Or : l'arnaque est un art rentable."],
        bonds: ["Une victime jure de me retrouver.", "Je dois entretenir un proche grâce à mes combines.", "Mon ancien complice connaît mes secrets."],
        flaws: ["Je ne peux m'empêcher d'arnaquer, même les amis.", "Je surestime mon bagou.", "Une dette de jeu me poursuit."],
    },
    "Hermit": {
        desc: "Vous avez vécu en isolement, méditant sur les mystères.",
        profs: ["Medicine", "Religion"], tools: ["Herbalism Kit"], languages: 1,
        feature: { name: "Découverte", description: "Votre longue retraite vous a révélé un secret unique et puissant." },
        ideals: ["Illumination : la vérité se trouve en soi.", "Bienveillance : aider sans rien attendre.", "Mystère : certaines connaissances doivent rester cachées."],
        bonds: ["Je dois protéger la découverte de ma retraite.", "Une question sans réponse a guidé mon exil.", "Je cherche celui qui m'a poussé à fuir le monde."],
        flaws: ["Je suis coupé des usages du monde.", "Mes grandes idées sombrent parfois dans la folie.", "Je garde un secret qui pourrait tout détruire."],
    },
    "Outlander": {
        desc: "Vous avez grandi loin de la civilisation, dans la nature.",
        profs: ["Athletics", "Survival"], tools: ["Musical Instrument"], languages: 1,
        feature: { name: "Vagabond", description: "Vous mémorisez le terrain et trouvez nourriture et eau fraîche pour le groupe en pleine nature." },
        ideals: ["Nature : le monde sauvage doit rester libre.", "Force : seul le plus fort survit.", "Liberté : nul mur ne me retiendra."],
        bonds: ["Ma terre sauvage natale est sacrée.", "Je protège une tribu ou un clan lointain.", "Un esprit de la nature veille sur moi."],
        flaws: ["La civilisation m'étouffe et m'agace.", "Je règle tout par la force.", "Je fais une confiance naïve aux bêtes, pas aux gens."],
    }
};
