import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../types';
import { anchoredPage } from './PaginationScreen';

const todos = (n: number): Todo[] =>
  Array.from({ length: n }, (_unused, i) => ({
    userId: 1,
    id: i + 1,
    title: `tarea ${String(i + 1)}`,
    completed: false,
  }));

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

type FetchImpl = () => Promise<Response> | Response;

function stubFetch(impl: FetchImpl) {
  const spy = vi.fn<FetchImpl>(impl);
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** `useTodos` cachea la peticion en el ambito del modulo: hay que reimportar. */
async function mount(url = '/') {
  window.history.replaceState(null, '', url);
  vi.resetModules();
  const { PaginationScreen } = await import('./PaginationScreen');
  return render(<PaginationScreen />);
}

const loaded = () => screen.findByText(/Mostrando/);
const nav = () => screen.getByRole('navigation', { name: 'Paginación' });
const pageButton = (n: number) => screen.getByRole('button', { name: `Página ${String(n)}` });
const edge = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.resetModules();
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('B1/B2 — semántica y ARIA (design-spec §6)', () => {
  it('la navegación es un <nav> con nombre accesible y una lista dentro', async () => {
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    expect(nav()).toBeInTheDocument();
    expect(within(nav()).getByRole('list')).toBeInTheDocument();
  });

  it('los números son <button> reales, no <li> clicables (D3)', async () => {
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    for (const n of [1, 2, 3, 4, 5]) {
      expect(pageButton(n).tagName).toBe('BUTTON');
      expect(pageButton(n)).toHaveAttribute('type', 'button');
    }
  });

  it('la página actual lleva aria-current="page" y ninguna otra', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=3');
    await loaded();

    expect(pageButton(3)).toHaveAttribute('aria-current', 'page');
    expect(pageButton(2)).not.toHaveAttribute('aria-current');
    expect(screen.getAllByRole('button', { current: 'page' })).toHaveLength(1);
  });

  it('la página actual sigue siendo focusable y clicable, nunca disabled', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=3');
    await loaded();

    expect(pageButton(3)).toBeEnabled();
  });

  it('los cuatro botones de extremo tienen etiqueta accesible en texto, no solo el glifo', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=5');
    await loaded();

    for (const name of ['Primera página', 'Página anterior', 'Página siguiente', 'Última página']) {
      expect(edge(name)).toBeInTheDocument();
    }
  });

  it('hay una única región aria-live (design-spec §6)', async () => {
    stubFetch(() => ok(todos(200)));
    const { container } = await mount();
    await loaded();

    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(container.querySelector('[aria-live]')).toHaveAttribute('aria-atomic', 'true');
  });

  it('el resumen usa el texto literal del spec', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=2');
    await loaded();

    expect(screen.getByText('Mostrando 11–20 de 200 resultados')).toBeInTheDocument();
  });
});

describe('D2 — la elipsis deja de ser un control', () => {
  it('el … no es un botón y está oculto a lectores de pantalla', async () => {
    stubFetch(() => ok(todos(200)));
    const { container } = await mount('/?page=10');
    await loaded();

    const ellipsis = container.querySelectorAll('.pagination__ellipsis');
    expect(ellipsis.length).toBeGreaterThan(0);
    for (const node of ellipsis) {
      expect(node.tagName).toBe('SPAN');
      expect(node).toHaveAttribute('aria-hidden', 'true');
    }
    expect(within(nav()).queryByRole('button', { name: /…/ })).toBeNull();
  });

  it('la ventana renderizada coincide con el algoritmo del spec', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=10');
    await loaded();

    const visibles = within(nav())
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
      .filter((label) => label?.startsWith('Página ') && /\d/.test(label));
    expect(visibles).toEqual(['Página 1', 'Página 9', 'Página 10', 'Página 11', 'Página 20']);
  });
});

describe('D6/A2 — disabled derivado del estado real, no de pages[0]', () => {
  it('en la primera página se apagan Primera y Anterior', async () => {
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    expect(edge('Primera página')).toBeDisabled();
    expect(edge('Página anterior')).toBeDisabled();
    expect(edge('Página siguiente')).toBeEnabled();
    expect(edge('Última página')).toBeEnabled();
  });

  it('en la última página se apagan Siguiente y Última', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=20');
    await loaded();

    expect(edge('Página siguiente')).toBeDisabled();
    expect(edge('Última página')).toBeDisabled();
    expect(edge('Primera página')).toBeEnabled();
  });

  it('durante la carga inicial no hay página actual: todo apagado', async () => {
    stubFetch(() => new Promise<Response>(() => undefined));
    await mount();

    expect(edge('Primera página')).toBeDisabled();
    expect(edge('Página anterior')).toBeDisabled();
    expect(edge('Página siguiente')).toBeDisabled();
    expect(edge('Última página')).toBeDisabled();
  });
});

describe('D14 — la página ya no se lee del DOM', () => {
  it('ningún control lleva un id numérico global', async () => {
    stubFetch(() => ok(todos(200)));
    const { container } = await mount();
    await loaded();

    const ids = [...container.querySelectorAll('[id]')].map((n) => n.id);
    expect(ids.filter((id) => /^\d+$/.test(id))).toEqual([]);
  });
});

describe('D7 — "Load More" desaparece', () => {
  it('no existe el botón engañoso; el tamaño se cambia con un select', async () => {
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
    expect(screen.getByLabelText('Filas por página')).toBeInTheDocument();
  });
});

describe('navegación', () => {
  it('ir a una página cambia los ítems y la URL', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    await user.click(pageButton(3));

    expect(await screen.findByText('Mostrando 21–30 de 200 resultados')).toBeInTheDocument();
    expect(screen.getByText('tarea 21')).toBeInTheDocument();
    expect(window.location.search).toBe('?page=3');
  });

  it('Última salta al final y Primera vuelve al principio', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    await user.click(edge('Última página'));
    expect(await screen.findByText('Mostrando 191–200 de 200 resultados')).toBeInTheDocument();

    await user.click(edge('Primera página'));
    expect(await screen.findByText('Mostrando 1–10 de 200 resultados')).toBeInTheDocument();
  });

  it('B3 — se navega con teclado y el foco se queda en el botón pulsado', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    edge('Página siguiente').focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Mostrando 11–20 de 200 resultados')).toBeInTheDocument();
    expect(document.activeElement).toBe(edge('Página siguiente'));

    await user.keyboard(' ');
    expect(await screen.findByText('Mostrando 21–30 de 200 resultados')).toBeInTheDocument();
    expect(document.activeElement).toBe(edge('Página siguiente'));
  });

  it('B3 — el foco no se pierde cuando el botón pulsado se queda deshabilitado', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount('/?page=19');
    await loaded();

    await user.click(edge('Página siguiente'));
    await waitFor(() => {
      expect(edge('Página siguiente')).toBeDisabled();
    });

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(edge('Página anterior'));
  });

  it('no hay tabindex positivo en ningún punto', async () => {
    stubFetch(() => ok(todos(200)));
    const { container } = await mount();
    await loaded();

    const positivos = [...container.querySelectorAll('[tabindex]')].filter(
      (n) => Number(n.getAttribute('tabindex')) > 0,
    );
    expect(positivos).toEqual([]);
  });
});

describe('D15/A3 — cambiar el tamaño de página no rompe nada (DEC-07)', () => {
  it('la fórmula de anclaje se comporta como dice DEC-07', () => {
    expect(anchoredPage(20, 10, 100)).toBe(2);
    expect(anchoredPage(2, 10, 50)).toBe(1);
    expect(anchoredPage(1, 10, 100)).toBe(1);
    expect(anchoredPage(11, 10, 20)).toBe(6);
    expect(anchoredPage(2, 100, 10)).toBe(11);
  });

  it('regresión D15: en la última página, cambiar el tamaño NO deja la lista vacía', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount('/?page=20');
    await loaded();
    expect(screen.getByText('Mostrando 191–200 de 200 resultados')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filas por página'), '100');

    // Antes: slice fuera de rango -> <ul></ul> y barra sin numeros.
    const resumen = await screen.findByText(/Mostrando/);
    expect(resumen).toHaveTextContent('Mostrando 101–200 de 200 resultados');
    expect(screen.getByText('tarea 101')).toBeInTheDocument();
    expect(within(nav()).getAllByRole('button', { name: /^Página \d+$/ }).length).toBeGreaterThan(
      0,
    );
    expect(pageButton(2)).toHaveAttribute('aria-current', 'page');
  });

  it('el usuario queda anclado al elemento que estaba mirando', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount('/?page=3');
    await loaded();
    expect(screen.getByText('tarea 21')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filas por página'), '20');

    expect(await screen.findByText('Mostrando 21–40 de 200 resultados')).toBeInTheDocument();
    expect(screen.getByText('tarea 21')).toBeInTheDocument();
  });

  it('nunca se llega a una página inexistente, para cualquier combinación', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount('/?page=20');
    await loaded();

    for (const size of ['50', '100', '20', '10']) {
      await user.selectOptions(screen.getByLabelText('Filas por página'), size);
      const resumen = await screen.findByText(/Mostrando/);
      expect(resumen.textContent).toMatch(/^Mostrando \d+–\d+ de 200 resultados$/);
      expect(within(nav()).getAllByRole('button', { current: 'page' })).toHaveLength(1);
    }
  });
});

describe('A4 — estados de pantalla', () => {
  it('loading pinta tantas filas de esqueleto como el tamaño de página', async () => {
    stubFetch(() => new Promise<Response>(() => undefined));
    const { container } = await mount('/?pageSize=20');

    expect(screen.getByText('Cargando resultados…')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-row')).toHaveLength(20);
  });

  it('error muestra el mensaje del spec y un botón de reintento que funciona', async () => {
    const user = userEvent.setup();
    let fallar = true;
    const spy = stubFetch(() => (fallar ? new Response('boom', { status: 500 }) : ok(todos(200))));
    await mount();

    // El texto sale dos veces a proposito: en la region aria-live (que lo
    // anuncia) y en el banner (que lo muestra). Lo exige el design-spec §4+§6.
    const mensajes = await screen.findAllByText(
      'No se pudieron cargar los resultados. Inténtalo de nuevo.',
    );
    expect(mensajes).toHaveLength(2);
    expect(spy).toHaveBeenCalledTimes(1);

    fallar = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Mostrando 1–10 de 200 resultados')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('lista vacía muestra el estado empty, no un error', async () => {
    stubFetch(() => ok([]));
    await mount();

    expect(await screen.findByText('No hay resultados que mostrar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('el botón Reintentar vive fuera de la región aria-live', async () => {
    stubFetch(() => new Response('boom', { status: 500 }));
    const { container } = await mount();
    await screen.findByRole('button', { name: 'Reintentar' });

    const live = container.querySelector('[aria-live]');
    expect(live).not.toBeNull();
    expect(live?.contains(screen.getByRole('button', { name: 'Reintentar' }))).toBe(false);
  });
});

describe('A5/A6 — URL', () => {
  it('una página fuera de rango en la URL se encaja contra el total real', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=999');
    await loaded();

    expect(screen.getByText('Mostrando 191–200 de 200 resultados')).toBeInTheDocument();
    expect(pageButton(20)).toHaveAttribute('aria-current', 'page');
  });

  it('parámetros basura no rompen la UI', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=abc&pageSize=7');
    await loaded();

    expect(screen.getByText('Mostrando 1–10 de 200 resultados')).toBeInTheDocument();
    expect(screen.getByLabelText('Filas por página')).toHaveValue('10');
  });
});

describe('salto directo del modo compacto (design-spec §5)', () => {
  it('existe un select con una opción por página y la actual seleccionada', async () => {
    stubFetch(() => ok(todos(200)));
    await mount('/?page=7');
    await loaded();

    const salto = screen.getByLabelText('Ir a la página');
    expect(within(salto).getAllByRole('option')).toHaveLength(20);
    expect(salto).toHaveValue('7');
  });

  it('cambiarlo navega igual que un botón de número', async () => {
    const user = userEvent.setup();
    stubFetch(() => ok(todos(200)));
    await mount();
    await loaded();

    await user.selectOptions(screen.getByLabelText('Ir a la página'), '12');
    expect(await screen.findByText('Mostrando 111–120 de 200 resultados')).toBeInTheDocument();
  });
});
