import test from "node:test";
import assert from "node:assert/strict";

import type { SessaoTreino } from "./workout-storage.ts";
import { getEffectiveRestSeconds } from "./workout-storage.ts";
import { calcularSequenciaDias } from "./stats.ts";

test("calcularSequenciaDias conta dias consecutivos com sessão finalizada", () => {
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  const anteontem = new Date(hoje.getTime() - 2 * 24 * 60 * 60 * 1000);

  const sessoes = [
    {
      id: "1",
      fichaId: "f1",
      fichaNome: "Ficha 1",
      descansoPadrao: 60,
      exercicios: [],
      exerciciosConcluidosIds: [],
      exerciciosPuladosIds: [],
      startedAt: anteontem.toISOString(),
      endedAt: anteontem.toISOString(),
      createdAt: anteontem.toISOString(),
      updatedAt: anteontem.toISOString(),
      syncedAt: null,
    },
    {
      id: "2",
      fichaId: "f1",
      fichaNome: "Ficha 1",
      descansoPadrao: 60,
      exercicios: [],
      exerciciosConcluidosIds: [],
      exerciciosPuladosIds: [],
      startedAt: ontem.toISOString(),
      endedAt: ontem.toISOString(),
      createdAt: ontem.toISOString(),
      updatedAt: ontem.toISOString(),
      syncedAt: null,
    },
    {
      id: "3",
      fichaId: "f1",
      fichaNome: "Ficha 1",
      descansoPadrao: 60,
      exercicios: [],
      exerciciosConcluidosIds: [],
      exerciciosPuladosIds: [],
      startedAt: hoje.toISOString(),
      endedAt: hoje.toISOString(),
      createdAt: hoje.toISOString(),
      updatedAt: hoje.toISOString(),
      syncedAt: null,
    },
  ];

  assert.equal(calcularSequenciaDias(sessoes as SessaoTreino[]), 3);
});

test("calcularSequenciaDias ignora sessões sem finalização", () => {
  const hoje = new Date();
  const sessoes = [
    {
      id: "1",
      fichaId: "f1",
      fichaNome: "Ficha 1",
      descansoPadrao: 60,
      exercicios: [],
      exerciciosConcluidosIds: [],
      exerciciosPuladosIds: [],
      startedAt: hoje.toISOString(),
      endedAt: null,
      createdAt: hoje.toISOString(),
      updatedAt: hoje.toISOString(),
      syncedAt: null,
    },
  ];

  assert.equal(calcularSequenciaDias(sessoes as SessaoTreino[]), 0);
});

test("getEffectiveRestSeconds usa o descanso do exercício quando estiver definido", () => {
  const exercicio = {
    id: "ex1",
    descricao: "Supino",
    series: 3,
    pesoSugerido: null,
    grupoMuscular: "Peito",
    repeticoes: "8-12",
    descansoSegundos: 45,
  };

  assert.equal(getEffectiveRestSeconds(exercicio, 60), 45);
  assert.equal(getEffectiveRestSeconds({ ...exercicio, descansoSegundos: undefined }, 60), 60);
});
