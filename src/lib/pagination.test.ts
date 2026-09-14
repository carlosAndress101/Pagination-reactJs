import { describe, expect, it } from 'vitest';
import { clampPage, ELLIPSIS, getPageRange, getTotalPages, MAX_SLOTS } from './pagination';
import type { PageSlot } from './pagination';

describe('getPageRange — los 6 ejemplos literales del design-spec §3', () => {
  it('total=1, current=1 -> [1], sin elipsis', () => {
    expect(getPageRange(1, 1)).toEqual([1]);
  });

  it('total=3, current=2 -> [1,2,3], sin elipsis', () => {
    expect(getPageRange(2, 3)).toEqual([1, 2, 3]);
  });

  it('total=7, current=4 -> [1..7]: 7 es el maximo sin elipsis', () => {
    expect(getPageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('total=20, current=1 -> cerca del inicio, solo elipsis derecha', () => {
    expect(getPageRange(1, 20)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 20]);
  });

  it('total=20, current=10 -> en medio, elipsis a ambos lados', () => {
    expect(getPageRange(10, 20)).toEqual([1, ELLIPSIS, 9, 10, 11, ELLIPSIS, 20]);
  });

  it('total=20, current=20 -> cerca del final, solo elipsis izquierda', () => {
    expect(getPageRange(20, 20)).toEqual([1, ELLIPSIS, 16, 17, 18, 19, 20]);
  });
});

describe('getPageRange — bordes del umbral', () => {
  it('total=8, current=4: no pone elipsis izquierda porque ocultaria una sola pagina', () => {
    expect(getPageRange(4, 8)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 8]);
  });

  it('total=8, current=5: espejo del anterior', () => {
    expect(getPageRange(5, 8)).toEqual([1, ELLIPSIS, 4, 5, 6, 7, 8]);
  });

  it('total=0 -> ventana vacia', () => {
    expect(getPageRange(1, 0)).toEqual([]);
  });

  it('una pagina actual fuera de rango se encaja antes de calcular la ventana', () => {
    expect(getPageRange(999, 20)).toEqual(getPageRange(20, 20));
    expect(getPageRange(0, 20)).toEqual(getPageRange(1, 20));
  });
});

const numbersOf = (slots: PageSlot[]): number[] =>
  slots.filter((slot): slot is number => slot !== ELLIPSIS);

describe('getPageRange — propiedades sobre total=1..200 x current=1..total', () => {
  const cases: Array<{ total: number; current: number; slots: PageSlot[] }> = [];
  for (let total = 1; total <= 200; total++) {
    for (let current = 1; current <= total; current++) {
      cases.push({ total, current, slots: getPageRange(current, total) });
    }
  }

  it('recorre 20 100 combinaciones', () => {
    expect(cases).toHaveLength((200 * 201) / 2);
  });

  it('la pagina actual siempre esta presente', () => {
    const fallos = cases.filter(({ current, slots }) => !slots.includes(current));
    expect(fallos).toEqual([]);
  });

  it('nunca hay mas de 7 posiciones', () => {
    const fallos = cases.filter(({ slots }) => slots.length > MAX_SLOTS);
    expect(fallos).toEqual([]);
  });

  it('ningun hueco oculta una sola pagina', () => {
    const fallos = cases.filter(({ slots }) =>
      slots.some((slot, i) => {
        if (slot !== ELLIPSIS) return false;
        const antes = slots[i - 1];
        const despues = slots[i + 1];
        if (typeof antes !== 'number' || typeof despues !== 'number') return true;
        return despues - antes < 3;
      }),
    );
    expect(fallos).toEqual([]);
  });

  it('los numeros van en orden ascendente y sin repetir', () => {
    const fallos = cases.filter(({ slots }) => {
      const nums = numbersOf(slots);
      const ordenados = nums.toSorted((a, b) => a - b);
      const unicos = new Set(nums);
      return unicos.size !== nums.length || nums.join() !== ordenados.join();
    });
    expect(fallos).toEqual([]);
  });

  it('siempre empieza en 1 y termina en total', () => {
    const fallos = cases.filter(({ total, slots }) => {
      const nums = numbersOf(slots);
      return nums[0] !== 1 || nums[nums.length - 1] !== total;
    });
    expect(fallos).toEqual([]);
  });

  it('nunca hay dos huecos seguidos', () => {
    const fallos = cases.filter(({ slots }) =>
      slots.some((slot, i) => slot === ELLIPSIS && slots[i + 1] === ELLIPSIS),
    );
    expect(fallos).toEqual([]);
  });

  it('con total <= 7 nunca hay hueco; con total > 7 siempre hay al menos uno', () => {
    const fallos = cases.filter(({ total, slots }) => {
      const tieneHueco = slots.includes(ELLIPSIS);
      return total <= MAX_SLOTS ? tieneHueco : !tieneHueco;
    });
    expect(fallos).toEqual([]);
  });
});

describe('getTotalPages', () => {
  it('reparte 200 items entre los tamanos ofrecidos', () => {
    expect(getTotalPages(200, 10)).toBe(20);
    expect(getTotalPages(200, 20)).toBe(10);
    expect(getTotalPages(200, 50)).toBe(4);
    expect(getTotalPages(200, 100)).toBe(2);
  });

  it('la ultima pagina incompleta cuenta como pagina', () => {
    expect(getTotalPages(201, 100)).toBe(3);
    expect(getTotalPages(1, 10)).toBe(1);
  });

  it('sin items no hay paginas', () => {
    expect(getTotalPages(0, 10)).toBe(0);
  });

  it('entradas absurdas devuelven 0 en vez de Infinity o NaN', () => {
    expect(getTotalPages(200, 0)).toBe(0);
    expect(getTotalPages(-5, 10)).toBe(0);
    expect(getTotalPages(Number.NaN, 10)).toBe(0);
    expect(getTotalPages(200, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('clampPage — el clamp que cierra D15/A3', () => {
  it('deja intacta una pagina dentro de rango', () => {
    expect(clampPage(5, 20)).toBe(5);
    expect(clampPage(1, 20)).toBe(1);
    expect(clampPage(20, 20)).toBe(20);
  });

  it('recorta por arriba: el escenario exacto de D15', () => {
    // pageSize 5 -> 40 paginas, el usuario esta en la 40; pasa a pageSize 10 -> 20 paginas.
    expect(clampPage(40, 20)).toBe(20);
  });

  it('recorta por abajo', () => {
    expect(clampPage(0, 20)).toBe(1);
    expect(clampPage(-3, 20)).toBe(1);
  });

  it('sin paginas devuelve 1, no 0', () => {
    expect(clampPage(7, 0)).toBe(1);
  });

  it('trunca decimales y sobrevive a NaN', () => {
    expect(clampPage(3.7, 20)).toBe(3);
    expect(clampPage(Number.NaN, 20)).toBe(1);
  });
});
