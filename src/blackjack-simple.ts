// ===== Modelos (sin enum, sin parameter properties) =====
const Suit = { Clubs: "♣", Diamonds: "♦", Hearts: "♥", Spades: "♠" } as const;
type Suit = typeof Suit[keyof typeof Suit];

const Rank = {
    A: "A", _2: "2", _3: "3", _4: "4", _5: "5", _6: "6",
    _7: "7", _8: "8", _9: "9", _10: "10", J: "J", Q: "Q", K: "K",
} as const;
type Rank = typeof Rank[keyof typeof Rank];

class Card {
    rank: Rank;
    suit: Suit;
    constructor(rank: Rank, suit: Suit) { this.rank = rank; this.suit = suit; }
    hardValue(): number {
        if (this.rank === Rank.A) return 11;
        if (this.rank === Rank.J || this.rank === Rank.Q || this.rank === Rank.K) return 10;
        return parseInt(this.rank as string, 10);
    }
    toString(): string { return `${this.rank}${this.suit}`; }
}

class Deck {
    private cards: Card[] = [];
    constructor(numDecks = 1) {
        const suits = Object.values(Suit);
        const ranks = Object.values(Rank);
        for (let n = 0; n < numDecks; n++) {
            for (const s of suits) for (const r of ranks) this.cards.push(new Card(r, s));
        }
        this.shuffle();
    }
    private shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = this.cards[i]; this.cards[i] = this.cards[j]; this.cards[j] = t;
        }
    }
    draw(): Card {
        const c = this.cards.pop();
        if (!c) throw new Error("Sin cartas");
        return c;
    }
    size(): number { return this.cards.length; } // <-- NUEVO
}

class Hand {
    private _cards: Card[] = [];
    get cards(): Card[] { return [...this._cards]; }
    add(c: Card): void { this._cards.push(c); }
    clear(): void { this._cards = []; } // <-- NUEVO
    total(): number {
        let sum = 0, aces = 0;
        for (const c of this._cards) { sum += c.hardValue(); if (c.rank === Rank.A) aces++; }
        while (sum > 21 && aces > 0) { sum -= 10; aces--; }
        return sum;
    }
    isBlackjack(): boolean { return this._cards.length === 2 && this.total() === 21; }
    isBust(): boolean { return this.total() > 21; }
    toString(): string { return this._cards.map(c => c.toString()).join(" "); }
}

class Participant {
    name: string;
    hand: Hand;
    constructor(name: string) { this.name = name; this.hand = new Hand(); }
    hit(deck: Deck): void { this.hand.add(deck.draw()); }
    get total(): number { return this.hand.total(); }
    get isBust(): boolean { return this.hand.isBust(); }
    get isBlackjack(): boolean { return this.hand.isBlackjack(); }
}

class Dealer extends Participant {
    standOnSoft17: boolean;
    constructor(standOnSoft17 = true) { super("Dealer"); this.standOnSoft17 = standOnSoft17; }
    private isSoft17(): boolean {
        let sum = 0, aces = 0;
        for (const c of this.hand.cards) { sum += c.hardValue(); if (c.rank === Rank.A) aces++; }
        let softSum = sum, softAces = aces;
        while (softSum > 21 && softAces > 0) { softSum -= 10; softAces--; }
        const usedAceAs11 = softAces < aces;
        return softSum === 17 && usedAceAs11;
    }
    play(deck: Deck): void {
        while (true) {
            const t = this.total;
            if (t < 17) this.hit(deck);
            else if (!this.standOnSoft17 && this.isSoft17()) this.hit(deck);
            else break;
        }
    }
}

// ===== Estado global =====
let deck = new Deck(4);
const player = new Participant("Tú");
const dealer = new Dealer(true);

// ===== DOM refs =====
const elPlayerCards = document.getElementById("playerCards") as HTMLSpanElement;
const elPlayerTotal = document.getElementById("playerTotal") as HTMLSpanElement;
const elDealerCards = document.getElementById("dealerCards") as HTMLSpanElement;
const elDealerTotal = document.getElementById("dealerTotal") as HTMLSpanElement;
const elMsg = document.getElementById("message") as HTMLParagraphElement;
const hitBtn = document.getElementById("hitBtn") as HTMLButtonElement;
const standBtn = document.getElementById("standBtn") as HTMLButtonElement;
const newBtn = document.getElementById("newBtn") as HTMLButtonElement;

function updateDisplay(hideDealerHole = true): void {
    elPlayerCards.textContent = player.hand.toString();
    elPlayerTotal.textContent = `= ${player.total}`;
    if (hideDealerHole) {
        const up = dealer.hand.cards[0]?.toString() ?? "";
        elDealerCards.textContent = `${up} ??`;
        elDealerTotal.textContent = "= ??";
    } else {
        elDealerCards.textContent = dealer.hand.toString();
        elDealerTotal.textContent = `= ${dealer.total}`;
    }
}

function endGame(msg: string): void {
    updateDisplay(false);
    elMsg.textContent = msg;
    hitBtn.disabled = true;
    standBtn.disabled = true;
}

// ---- NUEVO: iniciar o reiniciar una ronda ----
function startNewRound(): void {
    // Reponer mazo si quedan pocas cartas
    if (deck.size() < 15) deck = new Deck(4);

    // Limpiar manos
    player.hand.clear();
    dealer.hand.clear();
    elMsg.textContent = "";

    // Habilitar controles
    hitBtn.disabled = false;
    standBtn.disabled = false;

    // Reparto inicial
    player.hit(deck); dealer.hit(deck);
    player.hit(deck); dealer.hit(deck);

    updateDisplay(true);

    // Blackjacks naturales
    if (player.isBlackjack && dealer.isBlackjack) endGame("Empate: ambos blackjack");
    else if (player.isBlackjack) endGame("¡Ganas con blackjack!");
    else if (dealer.isBlackjack) endGame("Pierdes: dealer blackjack");
}

// ===== Interacciones =====
hitBtn.addEventListener("click", () => {
    player.hit(deck);
    updateDisplay(true);
    if (player.isBust) endGame("Te pasaste. Pierdes.");
});

standBtn.addEventListener("click", () => {
    dealer.play(deck);
    updateDisplay(false);
    if (dealer.isBust) endGame("Dealer se pasa. ¡Ganas!");
    else if (player.total > dealer.total) endGame("¡Ganas!");
    else if (player.total < dealer.total) endGame("Pierdes.");
    else endGame("Empate.");
});

newBtn.addEventListener("click", startNewRound);

// Primera ronda al cargar
startNewRound();
