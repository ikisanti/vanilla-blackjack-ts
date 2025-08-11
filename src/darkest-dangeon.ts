// darkest-deno.ts — Deno version (sin Node APIs)

// Utils
function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}
type Outcome = "win" | "lose" | "continue";

// Entidades
class Hero {
    name: string;
    maxHp: number;
    hp: number;
    stress: number; // 0-200
    attack: number;
    defense: number;

    constructor(name: string, hp = 28, atk = 8, def = 2) {
        this.name = name;
        this.maxHp = hp;
        this.hp = hp;
        this.stress = 0;
        this.attack = atk;
        this.defense = def;
    }
    get alive() { return this.hp > 0; }
    receiveDamage(raw: number) {
        const dmg = Math.max(0, raw - this.defense);
        this.hp = Math.max(0, this.hp - dmg);
        return dmg;
    }
    addStress(s: number) { this.stress = clamp(this.stress + s, 0, 200); }
    heal(h: number) { this.hp = clamp(this.hp + h, 0, this.maxHp); }
    calm(s: number) { this.stress = clamp(this.stress - s, 0, 200); }
}

class Enemy {
    name: string;
    hp: number;
    attack: number;
    constructor(name: string, hp: number, attack: number) {
        this.name = name; this.hp = hp; this.attack = attack;
    }
    get alive() { return this.hp > 0; }
    receiveDamage(n: number) { this.hp = Math.max(0, this.hp - n); return n; }
}

class Party {
    heroes: Hero[];
    constructor(heroes: Hero[]) { this.heroes = heroes; }
    get aliveHeroes() { return this.heroes.filter(h => h.alive); }
    get allDead() { return this.aliveHeroes.length === 0; }
    randomAlive(): Hero | null {
        const a = this.aliveHeroes; if (!a.length) return null;
        return a[randInt(0, a.length - 1)];
    }
}

// Strategy
interface ActionContext {
    hero: Hero; party: Party; enemy: Enemy; log: (msg: string) => void;
}
interface ActionStrategy { name: string; execute(ctx: ActionContext): void; }

class StrikeStrategy implements ActionStrategy {
    name = "Golpe";
    execute(ctx: ActionContext) {
        const base = ctx.hero.attack + randInt(-2, 3);
        const crit = Math.random() < 0.15;
        const dmg = ctx.enemy.receiveDamage(crit ? base * 2 : base);
        ctx.log(`${ctx.hero.name} ataca y causa ${dmg}${crit ? " (CRÍTICO)" : ""}.`);
    }
}
class GuardStrategy implements ActionStrategy {
    name = "Guardia";
    execute(ctx: ActionContext) {
        ctx.hero.defense += 3; // buff temporal (se revierte fin de turno)
        ctx.log(`${ctx.hero.name} adopta postura defensiva (+DEF este turno).`);
    }
}
class StressHealStrategy implements ActionStrategy {
    name = "Componer ánimo";
    execute(ctx: ActionContext) {
        const calm = randInt(8, 15);
        ctx.hero.calm(calm);
        ctx.log(`${ctx.hero.name} reduce ${calm} de estrés.`);
    }
}

const AVAILABLE_STRATEGIES: ActionStrategy[] = [
    new StrikeStrategy(), new GuardStrategy(), new StressHealStrategy(),
];

// Dungeon y Game
class Dungeon {
    totalRelics = 4;
    relics = 0;
    baseFunctional = true;

    explore(party: Party, log: (m: string) => void) {
        const roll = randInt(1, 100);
        if (roll <= 45) {
            this.relics++; log(`🔍 Reliquia encontrada (${this.relics}/${this.totalRelics}).`);
            party.randomAlive()?.addStress(randInt(3, 8));
        } else if (roll <= 75) {
            const h = party.randomAlive();
            if (h) {
                const dmg = h.receiveDamage(randInt(3, 7));
                h.addStress(randInt(8, 15));
                log(`⚠️ Trampa: ${h.name} sufre ${dmg} y gana estrés.`);
            }
        } else if (roll <= 90) {
            if (Math.random() < 0.3) { this.baseFunctional = false; log("🏚️ La base queda NO funcional."); }
            else log("🪝 Encuentro menor sin consecuencias.");
        } else {
            const h = party.randomAlive(); if (h) { h.addStress(randInt(10, 18)); log(`😖 Tensión: ${h.name} gana estrés.`); }
        }
    }
    repairBase(log: (m: string) => void) { this.baseFunctional = true; log("🔧 Base reparada."); }
    get readyForBoss() { return this.relics >= this.totalRelics; }
}

// Helpers de entrada
function ask(q: string, def = ""): string {
    const ans = prompt(q);
    return (ans ?? def).trim();
}

class Game {
    party = new Party([
        new Hero("Cruzado", 32, 9, 3),
        new Hero("Ocultista", 22, 7, 1),
        new Hero("Buffón", 24, 6, 2),
        new Hero("Médica de peste", 26, 7, 2),
    ]);
    dungeon = new Dungeon();
    boss = new Enemy("Corazón de la Oscuridad", 120, 12);

    log(m: string) { console.log(m); }
    status() {
        console.log("\n=== ESTADO ===");
        for (const h of this.party.heroes) {
            console.log(`${h.name.padEnd(14)} HP ${String(h.hp).padStart(2)}/${h.maxHp} | Estrés ${h.stress}`);
        }
        console.log(`Reliquias: ${this.dungeon.relics}/${this.dungeon.totalRelics} | Base: ${this.dungeon.baseFunctional ? "Funcional" : "NO funcional"}`);
        console.log("================\n");
    }
    checkOutcome(): Outcome {
        if (this.party.allDead) return "lose";
        if (this.boss.hp <= 0 && this.dungeon.relics >= this.dungeon.totalRelics) return "win";
        return "continue";
    }

    async simpleCombat(): Promise<boolean> {
        const foe = new Enemy("Abominación", randInt(20, 30), randInt(5, 8));
        this.log(`\n👹 ¡${foe.name} aparece! (HP ${foe.hp})`);

        while (foe.alive && !this.party.allDead) {
            const hero = this.party.randomAlive(); if (!hero) break;
            const preDef = hero.defense;

            this.log(`\nTurno de ${hero.name}. Enemigo HP: ${foe.hp}`);
            AVAILABLE_STRATEGIES.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
            const idx = clamp(parseInt(ask("Acción (1/2/3): ", "1"), 10) - 1, 0, AVAILABLE_STRATEGIES.length - 1);
            const strat = AVAILABLE_STRATEGIES[idx];
            strat.execute({ hero, party: this.party, enemy: foe, log: this.log.bind(this) });

            if (foe.alive) {
                const target = this.party.randomAlive(); if (!target) break;
                const raw = foe.attack + randInt(-2, 3);
                const dmg = target.receiveDamage(raw);
                target.addStress(randInt(3, 9));
                this.log(`El ${foe.name} golpea a ${target.name} por ${dmg}.`);
            }

            if (hero.defense > preDef) hero.defense = preDef; // quitar buff de guardia

            for (const h of this.party.aliveHeroes) {
                if (h.stress >= 100 && Math.random() < 0.25) {
                    const panicDmg = randInt(3, 8);
                    h.receiveDamage(panicDmg);
                    this.log(`😵 ${h.name} entra en crisis por estrés y recibe ${panicDmg}!`);
                }
            }
        }

        if (this.party.allDead) { this.log("La party ha sido aniquilada…"); return false; }
        this.log(`Has derrotado al ${foe.name}.`);
        const restHeal = randInt(3, 7);
        this.party.aliveHeroes.forEach(h => h.heal(restHeal));
        this.log(`Descanso: curan ${restHeal} HP.`);
        return true;
    }

    async bossCombat(): Promise<boolean> {
        this.log(`\n💀 BOSS: ${this.boss.name} (HP ${this.boss.hp})`);
        while (this.boss.alive && !this.party.allDead) {
            for (const hero of this.party.aliveHeroes) {
                console.log(`\nTurno de ${hero.name}. Boss HP: ${this.boss.hp}`);
                AVAILABLE_STRATEGIES.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
                const idx = clamp(parseInt(ask("Acción (1/2/3): ", "1"), 10) - 1, 0, AVAILABLE_STRATEGIES.length - 1);
                const strat = AVAILABLE_STRATEGIES[idx];
                const preDef = hero.defense;
                strat.execute({ hero, party: this.party, enemy: this.boss, log: this.log.bind(this) });

                const target = this.party.randomAlive(); if (!target) break;
                const raw = this.boss.attack + randInt(0, 4);
                const dmg = target.receiveDamage(raw);
                target.addStress(randInt(7, 14));
                this.log(`☠️  ${this.boss.name} castiga a ${target.name} por ${dmg}.`);

                if (hero.defense > preDef) hero.defense = preDef;
                this.party.aliveHeroes.forEach(h => h.addStress(2));
                for (const h of this.party.aliveHeroes) {
                    if (h.stress >= 100 && Math.random() < 0.3) {
                        const panicDmg = randInt(4, 10);
                        h.receiveDamage(panicDmg);
                        this.log(`💢 ${h.name} colapsa y recibe ${panicDmg}!`);
                    }
                }
                if (!this.boss.alive || this.party.allDead) break;
            }
        }
        return this.boss.hp <= 0;
    }

    async mainLoop() {
        console.clear();
        console.log("=== Darkest Dungeon (Consola · Deno TS + Strategy) ===\n");

        let running = true;
        while (running) {
            this.status();
            const out = this.checkOutcome();
            if (out === "win") { console.log("🎉 ¡Reuniste todas las reliquias y venciste al Boss!"); break; }
            if (out === "lose") { console.log("💀 Tu compañía cayó. Derrota."); break; }

            console.log("Acciones:");
            console.log("  1) Explorar");
            console.log("  2) Pelear (encuentro menor)");
            console.log("  3) Reparar base");
            console.log("  4) Enfrentar Boss (requiere todas las reliquias)");
            console.log("  5) Descansar (curar/bajar estrés)");
            console.log("  6) Salir");
            const choice = ask("Elige: ", "1");

            switch (choice) {
                case "1":
                    this.dungeon.explore(this.party, this.log.bind(this));
                    if (Math.random() < 0.35) await this.simpleCombat();
                    break;
                case "2":
                    await this.simpleCombat();
                    break;
                case "3":
                    if (this.dungeon.baseFunctional) console.log("La base ya está funcional.");
                    else this.dungeon.repairBase(this.log.bind(this));
                    break;
                case "4":
                    if (!this.dungeon.readyForBoss) { console.log("Aún no tienes todas las reliquias."); break; }
                    (await this.bossCombat())
                        ? console.log("🏆 ¡Has derrotado al Boss!")
                        : this.party.allDead && console.log("El Boss te ha superado…");
                    break;
                case "5":
                    this.party.aliveHeroes.forEach(h => { h.heal(randInt(2, 5)); h.calm(randInt(6, 12)); });
                    console.log("🛌 Descansas: +HP y -estrés.");
                    if (Math.random() < 0.2) { this.dungeon.baseFunctional = false; console.log("Incidente: la base queda NO funcional."); }
                    break;
                case "6":
                    running = false; break;
                default:
                    console.log("Opción no válida.");
            }
        }
        console.log("\n¡Gracias por jugar!");
    }
}

// Arranque
await new Game().mainLoop();
