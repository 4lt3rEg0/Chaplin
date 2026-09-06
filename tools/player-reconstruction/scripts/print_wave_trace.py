import json

def print_wave():
    with open('scripts/visual-regression/aqua-flow/wave_trace.json', encoding='utf-8') as f:
        data = json.load(f)
    print("Top points length:", len(data['top']))
    print("Top points first 10:", data['top'][:10])
    print("Top points last 10:", data['top'][-10:])
    print("Bottom points length:", len(data['bottom']))
    print("Bottom points first 10:", data['bottom'][:10])
    print("Bottom points last 10:", data['bottom'][-10:])

if __name__ == '__main__':
    print_wave()
