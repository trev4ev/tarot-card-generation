import { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useStore } from '../store';
import { rendererStub } from '../renderer/stub';

const CARD_W = 300;
const CARD_H = 520;

export function CardCanvas() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const activeBlueprint = useStore((s) => s.activeBlueprint());

  useEffect(() => {
    if (stageRef.current && activeBlueprint) {
      rendererStub.render(activeBlueprint, stageRef.current);
    }
  }, [activeBlueprint]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '24px',
      }}
    >
      <div
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Stage
          width={CARD_W}
          height={CARD_H}
          ref={(node) => {
            stageRef.current = node;
          }}
        />
      </div>
    </div>
  );
}
