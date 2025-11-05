export const lifecycle_registry = new Set<new () => any>();

export function register_lifecycle() {
    return function <T extends new (...args: any[]) => any>(constructor: T) {
        lifecycle_registry.add(constructor);
        return constructor;
    };
}