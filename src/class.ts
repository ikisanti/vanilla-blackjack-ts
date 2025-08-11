

class Warrior {

    name: string;
    age: number;

    constructor(name: string) {
        this.name = name
        this.age = 15
    }

    warriorName() {
        return this.name
    }
}


const viking = new Warrior('Viking')
console.log(`warrior name is :${viking.warriorName()}`)
console.log(`warrios age is: ${viking.age}`)


