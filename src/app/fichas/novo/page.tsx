"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Exercicio, FICHA_CORES, Ficha, GRUPOS_MUSCULARES } from "@/lib/workout-storage";
import {
  createFicha as createFichaLocal,
  listFichas,
  updateFicha as updateFichaLocal,
} from "@/lib/storage/fichas-local";
import { pushFicha } from "@/lib/sync/fichas-sync";

const FICHA_COLOR_MAP: Record<string, string> = {
  lime: "#a3e635",
  purple: "#a78bfa",
  orange: "#fbbf24",
  blue: "#60a5fa",
  pink: "#f472b6",
  teal: "#2dd4bf",
};

type FormState = {
  nome: string;
  descanso: string;
  cor: string;
};

type ExercicioDraft = {
  descricao: string;
  series: string;
  pesoSugerido: string;
  repeticoes: string;
  descansoSegundos: string;
  grupoMuscular: string;
};

const INITIAL_FORM: FormState = {
  nome: "",
  descanso: "60",
  cor: "lime",
};

const INITIAL_EXERCICIO_DRAFT: ExercicioDraft = {
  descricao: "",
  series: "4",
  pesoSugerido: "",
  repeticoes: "8-12",
  descansoSegundos: "",
  grupoMuscular: "Peito",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `exercicio-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createExercicioFromDraft(draft: ExercicioDraft): Exercicio {
  const series = Number(draft.series);
  const pesoSugerido = draft.pesoSugerido.trim() ? Number(draft.pesoSugerido) : null;
  const descansoSegundos = draft.descansoSegundos.trim() ? Number(draft.descansoSegundos) : null;

  const exercicio: Exercicio = {
    id: createId(),
    descricao: draft.descricao.trim(),
    series: Number.isFinite(series) && series > 0 ? series : 4,
    pesoSugerido:
      pesoSugerido !== null && Number.isFinite(pesoSugerido) && pesoSugerido >= 0 ? pesoSugerido : null,
    grupoMuscular: draft.grupoMuscular || "Peito",
    repeticoes: draft.repeticoes.trim() || "8-12",
  };

  if (descansoSegundos !== null && Number.isFinite(descansoSegundos) && descansoSegundos > 0) {
    exercicio.descansoSegundos = Math.round(descansoSegundos);
  }

  return exercicio;
}

export default function NovaFichaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
          <div className="mx-auto w-full max-w-7xl rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-10 rounded-full bg-white/10" />
              <div className="h-7 w-32 rounded-xl bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
            </div>
          </div>
        </div>
      }
    >
      <NovaFichaPageContent />
    </Suspense>
  );
}

function NovaFichaPageContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const autenticado = status === "authenticated";
  const id = searchParams.get("id");
  const [fichas, setFichas] = useState<Ficha[]>(() => listFichas());
  const fichaEmEdicao = useMemo(
    () => (id ? fichas.find((item) => item.id === id) ?? null : null),
    [fichas, id],
  );
  const fichaEmEdicaoId = fichaEmEdicao?.id ?? null;
  const [form, setForm] = useState<FormState>(() => {
    if (!fichaEmEdicao) {
      return INITIAL_FORM;
    }

    return {
      nome: fichaEmEdicao.nome,
      descanso: String(fichaEmEdicao.descanso),
      cor: fichaEmEdicao.cor || "lime",
    };
  });
  const [exerciciosCadastro, setExerciciosCadastro] = useState<Exercicio[]>(() =>
    fichaEmEdicao ? fichaEmEdicao.exercicios.map((exercicio) => ({ ...exercicio })) : [],
  );
  const [modalAberta, setModalAberta] = useState(false);
  const [exercicioDraft, setExercicioDraft] = useState<ExercicioDraft>(INITIAL_EXERCICIO_DRAFT);
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>(() =>
    fichaEmEdicao
      ? Object.fromEntries(fichaEmEdicao.exercicios.map((exercicio) => [exercicio.id, true]))
      : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    function carregar() {
      setFichas(listFichas());
    }

    carregar();
    window.addEventListener("gym-workout:fichas-changed", carregar);
    return () => window.removeEventListener("gym-workout:fichas-changed", carregar);
  }, []);

  const totalExercicios = useMemo(
    () => exerciciosCadastro.length,
    [exerciciosCadastro],
  );

  function atualizarExercicioCadastro(id: string, partial: Partial<Exercicio>) {
    setExerciciosCadastro((current) =>
      current.map((exercicio) => (exercicio.id === id ? { ...exercicio, ...partial } : exercicio)),
    );
  }

  function abrirModalExercicio() {
    setModalError(null);
    setExercicioDraft(INITIAL_EXERCICIO_DRAFT);
    setModalAberta(true);
  }

  function fecharModalExercicio() {
    setModalAberta(false);
    setModalError(null);
  }

  function adicionarExercicio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    const descricao = exercicioDraft.descricao.trim();
    const series = Number(exercicioDraft.series);
    const pesoSugerido = exercicioDraft.pesoSugerido.trim()
      ? Number(exercicioDraft.pesoSugerido)
      : null;

    if (!descricao) {
      setModalError("Informe a descricao do exercicio.");
      return;
    }

    if (!Number.isFinite(series) || series <= 0) {
      setModalError("As series devem ser maiores que zero.");
      return;
    }

    if (pesoSugerido !== null && (!Number.isFinite(pesoSugerido) || pesoSugerido < 0)) {
      setModalError("O peso sugerido deve ser vazio ou maior/igual a zero.");
      return;
    }

    const novoExercicio = createExercicioFromDraft(exercicioDraft);
    setExerciciosCadastro((current) => [...current, novoExercicio]);
    setExpandedExerciseIds((current) => ({ ...current, [novoExercicio.id]: true }));
    setModalAberta(false);
  }

  function removerExercicioCadastro(id: string) {
    setExerciciosCadastro((current) => current.filter((exercicio) => exercicio.id !== id));
    setExpandedExerciseIds((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function resetFormulario() {
    setForm(INITIAL_FORM);
    setExerciciosCadastro([]);
    setExpandedExerciseIds({});
    setError(null);
  }

  function cadastrarFicha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nome = form.nome.trim();
    const descanso = Number(form.descanso);

    if (!nome) {
      setError("Informe o nome da ficha.");
      return;
    }

    if (!exerciciosCadastro.length) {
      setError("Adicione pelo menos um exercicio.");
      return;
    }

    if (!Number.isFinite(descanso) || descanso <= 0) {
      setError("O descanso deve ser um numero maior que zero.");
      return;
    }

    const payload = {
      nome,
      exercicios: exerciciosCadastro,
      descanso,
      cor: form.cor || "lime",
    };

    const ficha = fichaEmEdicaoId
      ? updateFichaLocal(fichaEmEdicaoId, payload)
      : createFichaLocal(payload);

    if (ficha && autenticado) {
      pushFicha(ficha);
    }

    resetFormulario();
    window.location.href = "/fichas";
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -right-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 md:gap-8">
        <header className="rounded-2xl border border-white/10 bg-[#111c1a]/90 p-4 shadow-[0_20px_35px_rgba(0,0,0,0.25)] backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
          <Link
            href="/fichas"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            Voltar para fichas
          </Link>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl md:text-4xl">
            {fichaEmEdicaoId ? "Editar ficha" : "Nova Ficha"}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Configure os dados da ficha e organize os exercícios do seu treino.
          </p>
        </header>

        <form id="ficha-form" onSubmit={cadastrarFicha} className="rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.nome}
            onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-[#172420] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[#93a5a3] outline-none transition focus:border-[var(--accent)]"
            placeholder="Nome da ficha (ex: Treino A)"
          />

          <input
            value={form.descanso}
            onChange={(event) =>
              setForm((current) => ({ ...current, descanso: event.target.value }))
            }
            className="w-full rounded-2xl border border-white/10 bg-[#172420] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[#93a5a3] outline-none transition focus:border-[var(--accent)]"
            placeholder="Descanso padrão (segundos)"
          />

          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#172420] px-3 py-3 text-sm text-[var(--text-secondary)]">
            Cor da ficha
            <div className="mt-3 flex flex-wrap gap-3">
              {FICHA_CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, cor }))}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    form.cor === cor ? "border-white ring-2 ring-[var(--accent)]" : "border-white/40"
                  }`}
                  style={{ backgroundColor: FICHA_COLOR_MAP[cor] ?? "#a3e635" }}
                  aria-label={`Selecionar cor ${cor}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">Exercícios</h3>
              <button
                type="button"
                onClick={abrirModalExercicio}
                className="rounded-full bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
              >
                + Adicionar
              </button>
            </div>

            {exerciciosCadastro.length === 0 ? (
                    <div className="mt-3 min-h-[120px] rounded-2xl border border-dashed border-white/15 bg-[#172420]" />
            ) : (
              <ul className="mt-3 space-y-2">
                {exerciciosCadastro.map((exercicio, index) => (
                  <li key={exercicio.id} className="rounded-2xl border border-white/10 bg-[#172420] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedExerciseIds((current) => ({
                            ...current,
                            [exercicio.id]: !current[exercicio.id],
                          }))
                        }
                        className="flex flex-1 items-center justify-between gap-3 text-left"
                      >
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {index + 1}. {exercicio.descricao || "Exercício"}
                        </span>
                        <span className="text-xl font-bold text-[var(--text-secondary)]">
                          {expandedExerciseIds[exercicio.id] ? "−" : "+"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removerExercicioCadastro(exercicio.id)}
                        className="text-xs font-semibold text-red-300"
                      >
                        remover
                      </button>
                    </div>

                    {expandedExerciseIds[exercicio.id] ? (
                      <div className="mt-3 space-y-2">
                        <input
                          value={exercicio.descricao}
                          onChange={(event) =>
                            atualizarExercicioCadastro(exercicio.id, { descricao: event.target.value })
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={exercicio.series}
                            onChange={(event) =>
                              atualizarExercicioCadastro(exercicio.id, {
                                series: Number(event.target.value) || 1,
                              })
                            }
                            className="rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                          />
                          <input
                            value={exercicio.repeticoes || "8-12"}
                            onChange={(event) =>
                              atualizarExercicioCadastro(exercicio.id, { repeticoes: event.target.value })
                            }
                            className="rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={exercicio.pesoSugerido ?? ""}
                            onChange={(event) =>
                              atualizarExercicioCadastro(exercicio.id, {
                                pesoSugerido: event.target.value ? Number(event.target.value) : null,
                              })
                            }
                            className="rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                            placeholder="Peso"
                          />
                          <input
                            type="number"
                            min={0}
                            value={exercicio.descansoSegundos ?? ""}
                            onChange={(event) =>
                              atualizarExercicioCadastro(exercicio.id, {
                                descansoSegundos: event.target.value ? Number(event.target.value) : undefined,
                              })
                            }
                            className="rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                            placeholder="Descanso"
                          />
                        </div>
                        <select
                          value={exercicio.grupoMuscular || "Peito"}
                          onChange={(event) =>
                            atualizarExercicioCadastro(exercicio.id, {
                              grupoMuscular: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0f1715] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                        >
                          {GRUPOS_MUSCULARES.map((grupo) => (
                            <option key={grupo} value={grupo}>
                              {grupo}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {totalExercicios} exercício(s)
            </span>
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
            >
              Salvar ficha
            </button>
          </div>
        </form>
      </main>

      {modalAberta ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111c1a] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.38)] sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Adicionar exercício</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Preencha os detalhes do exercício para a ficha.
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalExercicio}
                className="rounded-lg border border-white/10 bg-[#172420] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={adicionarExercicio} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Descrição
                <input
                  value={exercicioDraft.descricao}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, descricao: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  placeholder="Ex: Supino reto com barra"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Séries
                  <input
                    type="number"
                    min={1}
                    value={exercicioDraft.series}
                    onChange={(event) =>
                      setExercicioDraft((current) => ({ ...current, series: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>

                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Repetições
                  <input
                    value={exercicioDraft.repeticoes}
                    onChange={(event) =>
                      setExercicioDraft((current) => ({ ...current, repeticoes: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="8-12"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Peso sugerido (kg)
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={exercicioDraft.pesoSugerido}
                    onChange={(event) =>
                      setExercicioDraft((current) => ({ ...current, pesoSugerido: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="Opcional"
                  />
                </label>

                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                  Descanso (s)
                  <input
                    type="number"
                    min={0}
                    value={exercicioDraft.descansoSegundos}
                    onChange={(event) =>
                      setExercicioDraft((current) => ({ ...current, descansoSegundos: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Grupo muscular
                <select
                  value={exercicioDraft.grupoMuscular}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, grupoMuscular: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#172420] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                >
                  {GRUPOS_MUSCULARES.map((grupo) => (
                    <option key={grupo} value={grupo}>
                      {grupo}
                    </option>
                  ))}
                </select>
              </label>

              {modalError ? <p className="text-sm font-medium text-red-400">{modalError}</p> : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={fecharModalExercicio}
                  className="w-full rounded-xl border border-white/10 bg-[#172420] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#0a120f] transition hover:brightness-95"
                >
                  Concluir
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
