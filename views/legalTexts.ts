/**
 * Textes légaux — CGU, confidentialité, mentions légales. FR et EN.
 *
 * Les champs entre [crochets] sont à COMPLÉTER par l'éditeur avant toute
 * mise en vente : identité, adresse, e-mail de contact. Tant qu'ils sont là,
 * tests/legal.test.ts échoue en mode « production » (voir ce test).
 */
export type LegalPage = 'terms' | 'privacy' | 'notice';

export const LEGAL_PLACEHOLDERS = {
    publisher: '[Nom ou raison sociale de l’éditeur]',
    address: '[Adresse postale de l’éditeur]',
    email: '[adresse e-mail de contact]',
    registration: '[SIREN / numéro d’immatriculation, le cas échéant]',
};

export const LAST_UPDATED = '2026-08-27';

interface Section { title: string; body: string[] }
export interface LegalDoc { title: string; intro?: string; sections: Section[] }

const P = LEGAL_PLACEHOLDERS;

export const LEGAL_TEXTS: Record<'fr' | 'en', Record<LegalPage, LegalDoc> & { nav: Record<LegalPage, string>; back: string; updated: string }> = {
    fr: {
        nav: { terms: 'Conditions d’utilisation', privacy: 'Confidentialité', notice: 'Mentions légales' },
        back: 'Retour au jeu',
        updated: `Dernière mise à jour : ${LAST_UPDATED}`,
        terms: {
            title: 'Conditions générales d’utilisation',
            intro: 'The Last Basement est un jeu de rôle en ligne dont la partie est menée par une intelligence artificielle, à la voix. En créant un compte, vous acceptez les présentes conditions.',
            sections: [
                { title: '1. Le service', body: [
                    'Le service vous permet de créer un personnage et de jouer des aventures narrées, arbitrées et mises en musique par des modèles d’intelligence artificielle (texte, voix, images), à partir de règles inspirées du System Reference Document 5.1.',
                    'Le service est fourni « en l’état ». Les modèles d’IA peuvent se tromper, se contredire, produire un contenu inattendu, ou être indisponibles. Nous ne garantissons ni la continuité du service ni la conservation indéfinie des parties.',
                ] },
                { title: '2. Compte', body: [
                    'Un compte est nécessaire. Vous êtes responsable de sa confidentialité et de son usage. Le service s’adresse aux personnes de 16 ans et plus.',
                    'Nous pouvons suspendre un compte en cas d’usage abusif : automatisation, contournement des quotas, tentative de faire produire au jeu un contenu illicite, ou atteinte au service.',
                ] },
                { title: '3. Quotas et usage raisonnable', body: [
                    'Chaque appel à l’IA a un coût. Le service applique des plafonds journaliers (sessions vocales, appels texte, images) selon votre plan. Ces plafonds sont indiqués dans l’écran « Compte » et peuvent évoluer.',
                ] },
                { title: '4. Abonnement et paiement', body: [
                    'Les offres payantes sont vendues par notre partenaire Paddle.com Market Ltd, qui agit en tant que marchand officiel (« Merchant of Record ») : Paddle encaisse le paiement, émet la facture et gère la TVA. Le paiement est soumis aux conditions de Paddle.',
                    'L’abonnement se renouvelle automatiquement à chaque période jusqu’à résiliation. Vous pouvez résilier à tout moment ; l’accès au plan payant reste actif jusqu’à la fin de la période déjà payée.',
                    'Droit de rétractation : en acceptant l’activation immédiate du service, vous reconnaissez que le droit de rétractation de 14 jours ne s’applique plus une fois le service pleinement exécuté. Pour toute demande de remboursement, contactez-nous ou Paddle.',
                ] },
                { title: '5. Contenu généré et propriété intellectuelle', body: [
                    'Le contenu généré pendant vos parties (récits, images, journaux) vous est destiné pour un usage personnel. Vous pouvez le partager (captures, vidéos, diffusion en direct) en mentionnant The Last Basement.',
                    'Le jeu, son code, ses campagnes originales, ses musiques et ses interfaces restent la propriété de l’éditeur.',
                    'Le jeu utilise le System Reference Document 5.1 de Wizards of the Coast LLC, disponible sous licence Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/legalcode). The Last Basement n’est ni affilié ni approuvé par Wizards of the Coast.',
                ] },
                { title: '6. Responsabilité', body: [
                    'Dans les limites permises par la loi, l’éditeur ne saurait être tenu responsable des dommages indirects liés à l’usage du service, ni du contenu produit par les modèles d’IA. Le contenu du jeu est une fiction destinée à un public adulte ou adolescent averti : il peut décrire violence et situations dramatiques.',
                ] },
                { title: '7. Modification et résiliation', body: [
                    'Nous pouvons faire évoluer le service et ces conditions ; les changements substantiels sont annoncés dans l’application. Vous pouvez supprimer votre compte à tout moment depuis l’écran « Compte » : vos données sont alors effacées (voir la politique de confidentialité).',
                ] },
                { title: '8. Droit applicable', body: [
                    `Ces conditions sont régies par le droit français. Tout litige relève des tribunaux compétents, après tentative de résolution amiable par écrit à ${P.email}.`,
                ] },
            ],
        },
        privacy: {
            title: 'Politique de confidentialité',
            intro: 'Ce que nous collectons, pourquoi, où cela vit, et comment l’effacer.',
            sections: [
                { title: 'Responsable du traitement', body: [`${P.publisher}, ${P.address} — ${P.email}.`] },
                { title: 'Données traitées', body: [
                    'Compte : adresse e-mail, identifiant, méthode de connexion (Google ou e-mail/mot de passe). Base légale : exécution du contrat.',
                    'Jeu : vos personnages, sauvegardes, journaux d’aventure et l’historique des parties, stockés sous votre identifiant. Base légale : exécution du contrat.',
                    'Voix et texte : pendant une partie, votre voix est transmise en direct à l’API Gemini de Google pour être comprise et répondue ; les transcriptions sont conservées dans votre sauvegarde. Nous n’enregistrons pas l’audio. Base légale : exécution du contrat.',
                    'Usage : compteurs journaliers (sessions, appels, images) liés à votre identifiant, pour appliquer les quotas. Base légale : intérêt légitime (maîtrise des coûts, lutte contre l’abus).',
                    'Erreurs techniques : en cas de plantage, un rapport (type d’erreur, page, navigateur, identifiant de compte — jamais l’e-mail) est envoyé à Sentry. Base légale : intérêt légitime.',
                    'Mesure d’audience : Firebase Analytics compte les écrans vus et quelques événements de jeu (partie lancée, combat, montée de niveau), sans contenu de partie. Base légale : intérêt légitime ; vous pouvez le bloquer avec les réglages de votre navigateur.',
                    'Paiement : si vous souscrivez, Paddle traite votre paiement et vos coordonnées de facturation comme marchand officiel ; nous ne recevons qu’un identifiant client et l’état de l’abonnement. Voir la politique de confidentialité de Paddle.',
                ] },
                { title: 'Sous-traitants et hébergement', body: [
                    'Google Cloud / Firebase (authentification, base de données, fonctions, hébergement — région europe-west1 pour les fonctions), Google Gemini API (modèles d’IA), Runware (génération d’images de scène), Sentry (rapports d’erreurs), Paddle (paiement).',
                    'Les modèles d’IA reçoivent le contenu de votre partie pour la faire vivre ; ils ne sont pas entraînés sur vos parties dans le cadre des API payantes utilisées par le service.',
                ] },
                { title: 'Durées', body: [
                    'Compte et sauvegardes : tant que le compte existe. Compteurs d’usage : 30 jours. Rapports d’erreurs : 90 jours. Trace de suppression de compte (identifiant seul) : 90 jours.',
                ] },
                { title: 'Vos droits', body: [
                    'Accès, rectification, effacement, limitation, portabilité, opposition. La suppression du compte est disponible directement dans l’écran « Compte » : elle efface vos sauvegardes, votre plan et vos compteurs, puis ferme le compte. Pour le reste, écrivez-nous ; vous pouvez aussi saisir la CNIL.',
                ] },
                { title: 'Cookies et stockage local', body: [
                    'Le jeu utilise le stockage local du navigateur pour la session de connexion, vos réglages (volume, voix, langue) et un cache des médias. Aucun cookie publicitaire.',
                ] },
            ],
        },
        notice: {
            title: 'Mentions légales',
            sections: [
                { title: 'Éditeur', body: [`${P.publisher}`, `${P.address}`, `${P.registration}`, `Contact : ${P.email}`] },
                { title: 'Hébergement', body: ['Google Ireland Limited (Firebase Hosting / Google Cloud), Gordon House, Barrow Street, Dublin 4, Irlande.'] },
                { title: 'Paiement', body: ['Paddle.com Market Ltd, Judd House, 18-29 Mora Street, London EC1V 8BT, Royaume-Uni — marchand officiel des offres payantes.'] },
                { title: 'Attributions', body: [
                    'Ce jeu utilise du contenu du System Reference Document 5.1 (« SRD 5.1 ») de Wizards of the Coast LLC, disponible sous licence Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/legalcode). Le SRD 5.1 est protégé par le droit d’auteur de Wizards of the Coast LLC.',
                ] },
            ],
        },
    },
    en: {
        nav: { terms: 'Terms of Use', privacy: 'Privacy', notice: 'Legal notice' },
        back: 'Back to the game',
        updated: `Last updated: ${LAST_UPDATED}`,
        terms: {
            title: 'Terms of Use',
            intro: 'The Last Basement is an online role-playing game whose session is run, out loud, by an artificial intelligence. By creating an account you accept these terms.',
            sections: [
                { title: '1. The service', body: [
                    'The service lets you create a character and play adventures narrated, adjudicated and scored by AI models (text, voice, images), on rules derived from the System Reference Document 5.1.',
                    'The service is provided “as is”. AI models can be wrong, contradict themselves, produce unexpected content, or be unavailable. We guarantee neither continuity of service nor indefinite retention of games.',
                ] },
                { title: '2. Account', body: [
                    'An account is required. You are responsible for its confidentiality and use. The service is intended for people aged 16 and over.',
                    'We may suspend an account for abuse: automation, quota circumvention, attempts to make the game produce unlawful content, or harm to the service.',
                ] },
                { title: '3. Quotas and fair use', body: [
                    'Every AI call has a cost. The service applies daily caps (voice sessions, text calls, images) according to your plan. They are shown in the “Account” screen and may change.',
                ] },
                { title: '4. Subscription and payment', body: [
                    'Paid plans are sold by our partner Paddle.com Market Ltd, acting as Merchant of Record: Paddle collects payment, issues the invoice and handles VAT. Payment is subject to Paddle’s terms.',
                    'Subscriptions renew automatically each period until cancelled. You can cancel at any time; the paid plan stays active until the end of the period already paid.',
                    'Withdrawal: by accepting immediate activation, you acknowledge that the 14-day withdrawal right no longer applies once the service has been fully performed. For refund requests, contact us or Paddle.',
                ] },
                { title: '5. Generated content and intellectual property', body: [
                    'Content generated during your games (stories, images, journals) is for your personal use. You may share it (screenshots, videos, live streams) with a mention of The Last Basement.',
                    'The game, its code, original campaigns, music and interfaces remain the property of the publisher.',
                    'The game uses the System Reference Document 5.1 by Wizards of the Coast LLC, available under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode). The Last Basement is neither affiliated with nor endorsed by Wizards of the Coast.',
                ] },
                { title: '6. Liability', body: [
                    'To the extent permitted by law, the publisher is not liable for indirect damages arising from use of the service, nor for content produced by AI models. The game is fiction for adult or mature teen audiences: it may depict violence and dramatic situations.',
                ] },
                { title: '7. Changes and termination', body: [
                    'We may change the service and these terms; substantial changes are announced in the app. You can delete your account at any time from the “Account” screen: your data is then erased (see the privacy policy).',
                ] },
                { title: '8. Governing law', body: [
                    `These terms are governed by French law. Disputes fall to the competent courts, after an attempt at amicable resolution in writing to ${P.email}.`,
                ] },
            ],
        },
        privacy: {
            title: 'Privacy policy',
            intro: 'What we collect, why, where it lives, and how to erase it.',
            sections: [
                { title: 'Data controller', body: [`${P.publisher}, ${P.address} — ${P.email}.`] },
                { title: 'Data we process', body: [
                    'Account: e-mail address, identifier, sign-in method (Google or e-mail/password). Legal basis: performance of the contract.',
                    'Game: your characters, saves, adventure journals and game history, stored under your identifier. Legal basis: performance of the contract.',
                    'Voice and text: during a game your voice is streamed live to Google’s Gemini API to be understood and answered; transcripts are kept in your save. We do not record audio. Legal basis: performance of the contract.',
                    'Usage: daily counters (sessions, calls, images) tied to your identifier, to enforce quotas. Legal basis: legitimate interest (cost control, abuse prevention).',
                    'Technical errors: on a crash, a report (error type, page, browser, account identifier — never the e-mail) is sent to Sentry. Legal basis: legitimate interest.',
                    'Audience measurement: Firebase Analytics counts screens viewed and a few game events (game started, combat, level up), without game content. Legal basis: legitimate interest; you can block it with your browser settings.',
                    'Payment: if you subscribe, Paddle processes your payment and billing details as Merchant of Record; we only receive a customer identifier and the subscription status. See Paddle’s privacy policy.',
                ] },
                { title: 'Processors and hosting', body: [
                    'Google Cloud / Firebase (authentication, database, functions, hosting — europe-west1 region for functions), Google Gemini API (AI models), Runware (scene image generation), Sentry (error reports), Paddle (payments).',
                    'AI models receive your game content to run it; they are not trained on your games under the paid APIs the service uses.',
                ] },
                { title: 'Retention', body: [
                    'Account and saves: as long as the account exists. Usage counters: 30 days. Error reports: 90 days. Account-deletion trace (identifier only): 90 days.',
                ] },
                { title: 'Your rights', body: [
                    'Access, rectification, erasure, restriction, portability, objection. Account deletion is available directly in the “Account” screen: it erases your saves, plan and counters, then closes the account. For anything else, write to us; you may also lodge a complaint with your data-protection authority.',
                ] },
                { title: 'Cookies and local storage', body: [
                    'The game uses browser local storage for the sign-in session, your settings (volume, voice, language) and a media cache. No advertising cookies.',
                ] },
            ],
        },
        notice: {
            title: 'Legal notice',
            sections: [
                { title: 'Publisher', body: [`${P.publisher}`, `${P.address}`, `${P.registration}`, `Contact: ${P.email}`] },
                { title: 'Hosting', body: ['Google Ireland Limited (Firebase Hosting / Google Cloud), Gordon House, Barrow Street, Dublin 4, Ireland.'] },
                { title: 'Payments', body: ['Paddle.com Market Ltd, Judd House, 18-29 Mora Street, London EC1V 8BT, United Kingdom — Merchant of Record for paid plans.'] },
                { title: 'Attributions', body: [
                    'This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.',
                ] },
            ],
        },
    },
};
