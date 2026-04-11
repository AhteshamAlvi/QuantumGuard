import random

def random_bits(n):
    return [random.randint(0, 1) for _ in range(n)]
