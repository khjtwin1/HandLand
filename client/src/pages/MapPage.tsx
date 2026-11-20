import { useEffect, useState } from "react";
import { getToken } from "../api/auth";
import { ApiError } from "../api/client";
import { fetchMap } from "../api/learning";
import type { MapData } from "../api/learning";
import ContinentTabs from "../components/ContinentTabs";
import StageMap from "../components/StageMap";
import StagePanel from "../components/StagePanel";
import { useAuth } from "../hooks/useAuth";
import "../styles/map.css";

// 탐험 지도 화면
export default function MapPage() {
  const { logout } = useAuth();
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState("");
  const [continentId, setContinentId] = useState<number | null>(null);
  const [stageId, setStageId] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchMap(token)
      .then((map) => {
        setData(map);
        const current = map.continents.find((c) =>
          c.stages.some((s) => s.id === map.current_stage_id),
        );
        const first =
          current ?? map.continents.find((c) => c.ready) ?? map.continents[0];
        setContinentId(first?.id ?? null);
        setStageId(map.current_stage_id ?? first?.stages[0]?.id ?? null);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          logout();
          return;
        }
        setError(
          e instanceof ApiError ? e.message : "지도를 불러오지 못했어요",
        );
      });
  }, [logout]);

  if (error || data === null) {
    return (
      <main className="map-page">
        <p className="map-page__message" role={error ? "alert" : undefined}>
          {error || "불러오는 중..."}
        </p>
      </main>
    );
  }

  const continent =
    data.continents.find((c) => c.id === continentId) ?? data.continents[0];
  const stage =
    continent?.stages.find((s) => s.id === stageId) ?? continent?.stages[0];

  const selectContinent = (id: number) => {
    const next = data.continents.find((c) => c.id === id);
    setContinentId(id);
    setStageId(
      next?.stages.find((s) => s.status === "current")?.id ??
        next?.stages[0]?.id ??
        null,
    );
  };

  return (
    <main className="map-page">
      <h1 className="map-page__title">탐험지도</h1>
      <p className="map-page__desc">
        스테이지를 클리어하고 깃발을 모으면 다음 대륙이 열려요.
      </p>
      <ContinentTabs
        continents={data.continents}
        selectedId={continent.id}
        onSelect={selectContinent}
      />

      <div className="map-page__body">
        {!continent.ready ? (
          // TODO: 대륙 스테이지와 단어가 추가되면 자동으로 지도가 보임
          <div className="map-page__empty">
            <p>{continent.name}대륙은 준비 중이에요</p>
          </div>
        ) : continent.locked ? (
          <div className="map-page__empty">
            <p>앞선 대륙을 모두 클리어하면 열려요</p>
          </div>
        ) : (
          <>
            <StageMap
              stages={continent.stages}
              selectedId={stage?.id ?? null}
              onSelect={setStageId}
            />
            {stage && <StagePanel stage={stage} />}
          </>
        )}
      </div>
    </main>
  );
}
