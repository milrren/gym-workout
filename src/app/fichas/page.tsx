"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Exercicio, Ficha } from "@/lib/workout-storage";
import {
  listFichas,
  createFicha as createFichaLocal,
  updateFicha as updateFichaLocal,
  deleteFicha as deleteFichaLocal,
  FICHAS_CHANGE_EVENT,
} from "@/lib/storage/fichas-local";
import { pushFicha, pushDeleteFicha } from "@/lib/sync/fichas-sync";
import { downloadFichasJson, parseFichasFromJson } from "@/lib/fichas-import-export";

type FormState = {
  nome: string;
  descanso: string;
};

type ExercicioDraft = {
  descricao: string;
  series: string;
  pesoSugerido: string;
};

const INITIAL_FORM: FormState = {
  nome: "",
  descanso: "60",
};

const INITIAL_EXERCICIO_DRAFT: ExercicioDraft = {
  descricao: "",
  series: "4",
  pesoSugerido: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `exercicio-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function FichasPage() {
  const { status } = useSession();
  const autenticado = status === "authenticated";
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [exerciciosCadastro, setExerciciosCadastro] = useState<Exercicio[]>([]);
  const [fichaEmEdicaoId, setFichaEmEdicaoId] = useState<string | null>(null);
  const [modalAberta, setModalAberta] = useState(false);
  const [exercicioDraft, setExercicioDraft] = useState<ExercicioDraft>(INITIAL_EXERCICIO_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function carregar() {
      setFichas(listFichas());
    }

    carregar();
    window.addEventListener(FICHAS_CHANGE_EVENT, carregar);
    return () => window.removeEventListener(FICHAS_CHANGE_EVENT, carregar);
  }, []);

  const totalExercicios = useMemo(
    () => fichas.reduce((acc, ficha) => acc + ficha.exercicios.length, 0),
    [fichas],
  );

  function resetFormulario() {
    setForm(INITIAL_FORM);
    setExerciciosCadastro([]);
    setFichaEmEdicaoId(null);
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

    const payload = { nome, exercicios: exerciciosCadastro, descanso };

    const ficha = fichaEmEdicaoId
      ? updateFichaLocal(fichaEmEdicaoId, payload)
      : createFichaLocal(payload);

    if (ficha && autenticado) {
      pushFicha(ficha);
    }

    resetFormulario();
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

    const novoExercicio: Exercicio = {
      id: createId(),
      descricao,
      series,
      pesoSugerido,
    };

    setExerciciosCadastro((current) => [...current, novoExercicio]);
    setModalAberta(false);
  }

  function removerExercicioCadastro(id: string) {
    setExerciciosCadastro((current) => current.filter((exercicio) => exercicio.id !== id));
  }

  function removerFicha(id: string) {
    const removida = deleteFichaLocal(id);

    if (fichaEmEdicaoId === id) {
      resetFormulario();
    }

    if (removida && autenticado) {
      pushDeleteFicha(id);
    }
  }

  function iniciarEdicaoFicha(ficha: Ficha) {
    setFichaEmEdicaoId(ficha.id);
    setForm({
      nome: ficha.nome,
      descanso: String(ficha.descanso),
    });
    setExerciciosCadastro(ficha.exercicios.map((exercicio) => ({ ...exercicio })));
    setError(null);
  }

  function exportarFichas() {
    downloadFichasJson(fichas);
  }

  function abrirSeletorImportacao() {
    importInputRef.current?.click();
  }

  async function importarFichas(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";

    if (!arquivo) {
      return;
    }

    try {
      const texto = await arquivo.text();
      const { fichas: importadas, invalidCount } = parseFichasFromJson(texto);

      if (!importadas.length) {
        setImportFeedback({ tipo: "erro", texto: "Nenhuma ficha valida encontrada no arquivo." });
        return;
      }

      for (const ficha of importadas) {
        const criada = createFichaLocal({
          nome: ficha.nome,
          exercicios: ficha.exercicios,
          descanso: ficha.descanso,
        });

        if (criada && autenticado) {
          pushFicha(criada);
        }
      }

      const sufixo = invalidCount ? `, ${invalidCount} invalida(s) ignorada(s)` : "";
      setImportFeedback({
        tipo: "sucesso",
        texto: `${importadas.length} ficha(s) importada(s)${sufixo}.`,
      });
    } catch {
      setImportFeedback({ tipo: "erro", texto: "Arquivo JSON invalido." });
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-main)] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute -top-24 -right-16 hidden h-72 w-72 rounded-full bg-[var(--surface-spot)] blur-3xl sm:block" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6 md:gap-8">
        <header className="rounded-2xl border border-black/10 bg-white/85 p-4 shadow-lg backdrop-blur sm:rounded-3xl sm:p-6 md:p-8">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            Voltar para inicio
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl md:text-4xl">
            Modulo de Fichas
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Cadastre fichas com ID, nome, exercicios e descanso entre series. Os dados ficam
            salvos no seu dispositivo e, quando voce estiver logado, sao sincronizados
            automaticamente com sua conta.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Fichas
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">{fichas.length}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Exercicios
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)] sm:text-2xl md:text-3xl">{totalExercicios}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                Persistencia
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {autenticado ? "Local + sincronizado" : "Local (faca login para sincronizar)"}
              </p>
            </article>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportarFichas}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
            >
              Exportar fichas (JSON)
            </button>
            <button
              type="button"
              onClick={abrirSeletorImportacao}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
            >
              Importar fichas (JSON)
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importarFichas}
            />
            {importFeedback ? (
              <p
                className={`text-xs font-semibold ${
                  importFeedback.tipo === "sucesso" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {importFeedback.texto}
              </p>
            ) : null}
          </div>
        </header>


        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={cadastrarFicha}
            className={`rounded-2xl border border-black/10 p-4 shadow-sm sm:rounded-3xl sm:p-6 ${
              fichaEmEdicaoId ? "bg-[#fff7d6]" : "bg-white"
            }`}
          >
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {fichaEmEdicaoId ? "Editar ficha" : "Nova ficha"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Monte sua lista de exercicios.</p>

            {fichaEmEdicaoId ? (
              <button
                type="button"
                onClick={resetFormulario}
                className="mt-4 rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
              >
                Cancelar edicao
              </button>
            ) : null}

            <label className="mt-5 block text-sm font-semibold text-[var(--text-primary)]">
              Nome
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                placeholder="Ex: Treino A - Peito e Triceps"
              />
            </label>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Exercicios</p>
                <button
                  type="button"
                  onClick={abrirModalExercicio}
                  className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
                >
                  Adicionar exercicio
                </button>
              </div>

              {exerciciosCadastro.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-black/20 bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  Nenhum exercicio adicionado.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {exerciciosCadastro.map((exercicio, index) => (
                    <li
                      key={exercicio.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[var(--surface-soft)] p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {index + 1}. {exercicio.descricao}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {exercicio.series} series
                          {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerExercicioCadastro(exercicio.id)}
                        className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold transition hover:bg-black/5"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
              Descanso (segundos)
              <input
                type="number"
                min={1}
                value={form.descanso}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descanso: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {fichaEmEdicaoId ? "Salvar alteracoes" : "Cadastrar ficha"}
            </button>
          </form>

          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Fichas cadastradas</h2>

            {fichas.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-black/20 bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-secondary)]">
                Nenhuma ficha cadastrada ainda.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {fichas.map((ficha) => (
                  <li key={ficha.id} className="rounded-2xl border border-black/10 bg-[var(--surface-soft)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          ID: {ficha.id}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-[var(--text-primary)]">{ficha.nome}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoFicha(ficha)}
                          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removerFicha(ficha.id)}
                          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-black/5 sm:py-1.5"
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                      <span className="rounded-full border border-black/15 bg-white px-2 py-1">
                        Descanso: {ficha.descanso}s
                      </span>
                      <span className="rounded-full border border-black/15 bg-white px-2 py-1">
                        Exercicios: {ficha.exercicios.length}
                      </span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {ficha.exercicios.map((exercicio) => (
                        <li key={exercicio.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                          <p className="font-semibold text-[var(--text-primary)]">{exercicio.descricao}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {exercicio.series} series
                            {exercicio.pesoSugerido !== null ? ` • ${exercicio.pesoSugerido} kg` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {modalAberta ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Adicionar exercicio</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Informe descricao, series e peso sugerido (opcional).
                </p>
              </div>
              <button
                type="button"
                onClick={fecharModalExercicio}
                className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs font-semibold transition hover:bg-black/5"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={adicionarExercicio} className="mt-5">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                Descricao
                <input
                  value={exercicioDraft.descricao}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, descricao: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="Ex: Supino reto com barra"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
                Series
                <input
                  type="number"
                  min={1}
                  value={exercicioDraft.series}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, series: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-[var(--text-primary)]">
                Peso sugerido (kg)
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={exercicioDraft.pesoSugerido}
                  onChange={(event) =>
                    setExercicioDraft((current) => ({ ...current, pesoSugerido: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)]"
                  placeholder="Opcional"
                />
              </label>

              {modalError ? <p className="mt-4 text-sm font-medium text-red-600">{modalError}</p> : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={fecharModalExercicio}
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
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
