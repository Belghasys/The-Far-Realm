/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./App.tsx"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                fantasy: ['Cinzel', 'serif'],
                rpg: ['MedievalSharp', 'cursive'],
                mono: ['Roboto Mono', 'monospace'],
            },
            colors: {
                parchment: '#d4c5a3',
                gold: '#ffd700',
                blood: '#8a0303',
                darkbg: '#0f0f12',
                panel: '#1a1a1f'
            }
        },
    },
    plugins: [],
}
