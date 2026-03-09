// AngelScript example

// Simple function
void HelloWorld() {
    Print("Hello, World!");
}

// Class with members
class Animal {
    string name;
    int age;

    Animal(string n, int a) {
        name = n;
        age = a;
    }

    void Speak() {
        Print(name + " says hello!");
    }
}

// Interface
interface IMovable {
    void Move(float x, float y);
    float GetSpeed() const;
}

// Enum
enum Color {
    Red = 0,
    Green,
    Blue,
}

// Function with various expressions
int Calculate(int a, int b) {
    int result = a + b * 2;
    if (result > 10) {
        result -= 5;
    } else if (result < 0) {
        result = 0;
    }
    return result;
}

// Loops
void LoopExample() {
    for (int i = 0; i < 10; i++) {
        if (i % 2 == 0) continue;
        Print(i);
    }

    int n = 0;
    while (n < 5) {
        n++;
    }
}

