
class Hero {
    name: string;
    constructor(name: string) {
        this.name = name
        console.log(this)
    }

    heroHealth() {
        this
    }

}

const viking = new Hero("Ragknar")
console.log(viking.name)
console.log(viking.heroHealth())



function heroAttack() {
    return {
        "power": 55,
        "dodge": () => { console.log("dogge quickly") }
    }
}

const heroAction = heroAttack()
console.log(heroAction.dodge)