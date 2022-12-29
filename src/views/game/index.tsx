import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { GameMode } from "../../game/game-modes";
import { startGame } from "../../game/start-game";

export default function GameView() {
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = new URLSearchParams(search).get("mode");
    const onFinish = () => {
      navigate("/");
    };

    const finishCallback = startGame(mode as GameMode, onFinish);

    return () => {
      finishCallback();
    }
  }, []);

  return <div className="Game" />;
}
