import CoreGraphics

public enum PLArt: String, CaseIterable, Sendable {
    case ticket = "ticket"
    case tornLabel = "torn-label"
    case seal = "seal"
    case kente = "kente"
    case pebble = "pebble"
    case azulejo = "azulejo"
    case azulejoGrid = "azulejo-grid"
    case girih = "girih"
    case flagBand = "flag-band"
    case streakFlame = "streak-flame"
    case streakPot = "streak-pot"
    case star = "star"
    case blocks = "blocks"
    case brush = "brush"
    case bunting = "bunting"
    case scriptRu = "script-ru"
    case scriptKo = "script-ko"
    case scriptHe = "script-he"
    case calligraphyAin = "calligraphy-ain"
    case calligraphyYong = "calligraphy-yong"
    case inkDot = "ink-dot"
    case skKente = "sk-kente"
    case skAzulejo = "sk-azulejo"
    case skGirih = "sk-girih"
    case skSeal = "sk-seal"
    case skPaisley = "sk-paisley"
    case skMudcloth = "sk-mudcloth"
    case objectApple = "object-apple"
    case objectBag = "object-bag"
    case objectBall = "object-ball"
    case objectBird = "object-bird"
    case objectBoat = "object-boat"
    case objectBook = "object-book"
    case objectBread = "object-bread"
    case objectCar = "object-car"
    case objectCat = "object-cat"
    case objectChair = "object-chair"
    case objectCheese = "object-cheese"
    case objectChicken = "object-chicken"
    case objectChild = "object-child"
    case objectCity = "object-city"
    case objectClock = "object-clock"
    case objectCoffee = "object-coffee"
    case objectCow = "object-cow"
    case objectDog = "object-dog"
    case objectDoor = "object-door"
    case objectEgg = "object-egg"
    case objectFire = "object-fire"
    case objectFish = "object-fish"
    case objectFlower = "object-flower"
    case objectHat = "object-hat"
    case objectHorse = "object-horse"
    case objectHouse = "object-house"
    case objectHundred = "object-hundred"
    case objectKey = "object-key"
    case objectKnife = "object-knife"
    case objectLetter = "object-letter"
    case objectMeat = "object-meat"
    case objectMilk = "object-milk"
    case objectMoney = "object-money"
    case objectMoon = "object-moon"
    case objectMountain = "object-mountain"
    case objectOne = "object-one"
    case objectOrange = "object-orange"
    case objectPaper = "object-paper"
    case objectRice = "object-rice"
    case objectRiver = "object-river"
    case objectRoad = "object-road"
    case objectSalt = "object-salt"
    case objectSchool = "object-school"
    case objectSea = "object-sea"
    case objectShirt = "object-shirt"
    case objectShoe = "object-shoe"
    case objectStar = "object-star"
    case objectStone = "object-stone"
    case objectSun = "object-sun"
    case objectTea = "object-tea"
    case objectThree = "object-three"
    case objectTree = "object-tree"
    case objectTwo = "object-two"
    case objectWater = "object-water"
    case objectWindow = "object-window"
    case objectWine = "object-wine"

    public var label: String {
        switch self {
        case .ticket: "Ticket stamp"
        case .tornLabel: "Torn label"
        case .seal: "Red seal"
        case .kente: "Kente strip"
        case .pebble: "Red pebble"
        case .azulejo: "Azulejo tile"
        case .azulejoGrid: "Azulejo rings"
        case .girih: "Girih lattice"
        case .flagBand: "Flag band"
        case .streakFlame: "Streak flame"
        case .streakPot: "Streak pot"
        case .star: "Star piece"
        case .blocks: "Puzzle blocks"
        case .brush: "Brush stroke"
        case .bunting: "Pennant bunting"
        case .scriptRu: "Script сто"
        case .scriptKo: "Script 백"
        case .scriptHe: "Script מאה"
        case .calligraphyAin: "Calligraphy ع"
        case .calligraphyYong: "Calligraphy 永"
        case .inkDot: "Ink dot"
        case .skKente: "Kente swatch"
        case .skAzulejo: "Azulejo swatch"
        case .skGirih: "Girih swatch"
        case .skSeal: "Seal swatch"
        case .skPaisley: "Paisley swatch"
        case .skMudcloth: "Mudcloth swatch"
        case .objectApple: "apple"
        case .objectBag: "bag"
        case .objectBall: "ball"
        case .objectBird: "bird"
        case .objectBoat: "boat"
        case .objectBook: "book"
        case .objectBread: "bread"
        case .objectCar: "car"
        case .objectCat: "cat"
        case .objectChair: "chair"
        case .objectCheese: "cheese"
        case .objectChicken: "chicken"
        case .objectChild: "child"
        case .objectCity: "city"
        case .objectClock: "clock"
        case .objectCoffee: "coffee"
        case .objectCow: "cow"
        case .objectDog: "dog"
        case .objectDoor: "door"
        case .objectEgg: "egg"
        case .objectFire: "fire"
        case .objectFish: "fish"
        case .objectFlower: "flower"
        case .objectHat: "hat"
        case .objectHorse: "horse"
        case .objectHouse: "house"
        case .objectHundred: "hundred"
        case .objectKey: "key"
        case .objectKnife: "knife"
        case .objectLetter: "letter"
        case .objectMeat: "meat"
        case .objectMilk: "milk"
        case .objectMoney: "money"
        case .objectMoon: "moon"
        case .objectMountain: "mountain"
        case .objectOne: "one"
        case .objectOrange: "orange"
        case .objectPaper: "paper"
        case .objectRice: "rice"
        case .objectRiver: "river"
        case .objectRoad: "road"
        case .objectSalt: "salt"
        case .objectSchool: "school"
        case .objectSea: "sea"
        case .objectShirt: "shirt"
        case .objectShoe: "shoe"
        case .objectStar: "star"
        case .objectStone: "stone"
        case .objectSun: "sun"
        case .objectTea: "tea"
        case .objectThree: "three"
        case .objectTree: "tree"
        case .objectTwo: "two"
        case .objectWater: "water"
        case .objectWindow: "window"
        case .objectWine: "wine"
        }
    }

    public var size: CGSize {
        switch self {
        case .ticket: CGSize(width: 260, height: 120)
        case .tornLabel: CGSize(width: 220, height: 110)
        case .seal: CGSize(width: 150, height: 150)
        case .kente: CGSize(width: 300, height: 90)
        case .pebble: CGSize(width: 110, height: 150)
        case .azulejo: CGSize(width: 170, height: 170)
        case .azulejoGrid: CGSize(width: 160, height: 160)
        case .girih: CGSize(width: 180, height: 180)
        case .flagBand: CGSize(width: 600, height: 18)
        case .streakFlame: CGSize(width: 34, height: 44)
        case .streakPot: CGSize(width: 100, height: 184)
        case .star: CGSize(width: 150, height: 140)
        case .blocks: CGSize(width: 170, height: 150)
        case .brush: CGSize(width: 600, height: 200)
        case .bunting: CGSize(width: 300, height: 110)
        case .scriptRu: CGSize(width: 80, height: 60)
        case .scriptKo: CGSize(width: 80, height: 60)
        case .scriptHe: CGSize(width: 80, height: 60)
        case .calligraphyAin: CGSize(width: 200, height: 200)
        case .calligraphyYong: CGSize(width: 200, height: 200)
        case .inkDot: CGSize(width: 40, height: 40)
        case .skKente: CGSize(width: 48, height: 48)
        case .skAzulejo: CGSize(width: 48, height: 48)
        case .skGirih: CGSize(width: 48, height: 48)
        case .skSeal: CGSize(width: 48, height: 48)
        case .skPaisley: CGSize(width: 48, height: 48)
        case .skMudcloth: CGSize(width: 48, height: 48)
        case .objectApple: CGSize(width: 100, height: 100)
        case .objectBag: CGSize(width: 100, height: 100)
        case .objectBall: CGSize(width: 100, height: 100)
        case .objectBird: CGSize(width: 100, height: 100)
        case .objectBoat: CGSize(width: 100, height: 100)
        case .objectBook: CGSize(width: 100, height: 100)
        case .objectBread: CGSize(width: 100, height: 100)
        case .objectCar: CGSize(width: 100, height: 100)
        case .objectCat: CGSize(width: 100, height: 100)
        case .objectChair: CGSize(width: 100, height: 100)
        case .objectCheese: CGSize(width: 100, height: 100)
        case .objectChicken: CGSize(width: 100, height: 100)
        case .objectChild: CGSize(width: 100, height: 100)
        case .objectCity: CGSize(width: 100, height: 100)
        case .objectClock: CGSize(width: 100, height: 100)
        case .objectCoffee: CGSize(width: 100, height: 100)
        case .objectCow: CGSize(width: 100, height: 100)
        case .objectDog: CGSize(width: 100, height: 100)
        case .objectDoor: CGSize(width: 100, height: 100)
        case .objectEgg: CGSize(width: 100, height: 100)
        case .objectFire: CGSize(width: 100, height: 100)
        case .objectFish: CGSize(width: 100, height: 100)
        case .objectFlower: CGSize(width: 100, height: 100)
        case .objectHat: CGSize(width: 100, height: 100)
        case .objectHorse: CGSize(width: 100, height: 100)
        case .objectHouse: CGSize(width: 100, height: 100)
        case .objectHundred: CGSize(width: 100, height: 100)
        case .objectKey: CGSize(width: 100, height: 100)
        case .objectKnife: CGSize(width: 100, height: 100)
        case .objectLetter: CGSize(width: 100, height: 100)
        case .objectMeat: CGSize(width: 100, height: 100)
        case .objectMilk: CGSize(width: 100, height: 100)
        case .objectMoney: CGSize(width: 100, height: 100)
        case .objectMoon: CGSize(width: 100, height: 100)
        case .objectMountain: CGSize(width: 100, height: 100)
        case .objectOne: CGSize(width: 100, height: 100)
        case .objectOrange: CGSize(width: 100, height: 100)
        case .objectPaper: CGSize(width: 100, height: 100)
        case .objectRice: CGSize(width: 100, height: 100)
        case .objectRiver: CGSize(width: 100, height: 100)
        case .objectRoad: CGSize(width: 100, height: 100)
        case .objectSalt: CGSize(width: 100, height: 100)
        case .objectSchool: CGSize(width: 100, height: 100)
        case .objectSea: CGSize(width: 100, height: 100)
        case .objectShirt: CGSize(width: 100, height: 100)
        case .objectShoe: CGSize(width: 100, height: 100)
        case .objectStar: CGSize(width: 100, height: 100)
        case .objectStone: CGSize(width: 100, height: 100)
        case .objectSun: CGSize(width: 100, height: 100)
        case .objectTea: CGSize(width: 100, height: 100)
        case .objectThree: CGSize(width: 100, height: 100)
        case .objectTree: CGSize(width: 100, height: 100)
        case .objectTwo: CGSize(width: 100, height: 100)
        case .objectWater: CGSize(width: 100, height: 100)
        case .objectWindow: CGSize(width: 100, height: 100)
        case .objectWine: CGSize(width: 100, height: 100)
        }
    }

    public var dark: Bool {
        switch self {
        case .ticket: false
        case .tornLabel: false
        case .seal: false
        case .kente: false
        case .pebble: false
        case .azulejo: false
        case .azulejoGrid: false
        case .girih: false
        case .flagBand: false
        case .streakFlame: false
        case .streakPot: false
        case .star: false
        case .blocks: false
        case .brush: false
        case .bunting: false
        case .scriptRu: true
        case .scriptKo: true
        case .scriptHe: true
        case .calligraphyAin: true
        case .calligraphyYong: true
        case .inkDot: true
        case .skKente: false
        case .skAzulejo: false
        case .skGirih: false
        case .skSeal: false
        case .skPaisley: false
        case .skMudcloth: false
        case .objectApple: false
        case .objectBag: false
        case .objectBall: false
        case .objectBird: false
        case .objectBoat: false
        case .objectBook: false
        case .objectBread: false
        case .objectCar: false
        case .objectCat: false
        case .objectChair: false
        case .objectCheese: false
        case .objectChicken: false
        case .objectChild: false
        case .objectCity: false
        case .objectClock: false
        case .objectCoffee: false
        case .objectCow: false
        case .objectDog: false
        case .objectDoor: false
        case .objectEgg: false
        case .objectFire: false
        case .objectFish: false
        case .objectFlower: false
        case .objectHat: false
        case .objectHorse: false
        case .objectHouse: false
        case .objectHundred: false
        case .objectKey: false
        case .objectKnife: false
        case .objectLetter: false
        case .objectMeat: false
        case .objectMilk: false
        case .objectMoney: false
        case .objectMoon: false
        case .objectMountain: false
        case .objectOne: false
        case .objectOrange: false
        case .objectPaper: false
        case .objectRice: false
        case .objectRiver: false
        case .objectRoad: false
        case .objectSalt: false
        case .objectSchool: false
        case .objectSea: false
        case .objectShirt: false
        case .objectShoe: false
        case .objectStar: false
        case .objectStone: false
        case .objectSun: false
        case .objectTea: false
        case .objectThree: false
        case .objectTree: false
        case .objectTwo: false
        case .objectWater: false
        case .objectWindow: false
        case .objectWine: false
        }
    }
}
