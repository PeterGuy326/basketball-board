import { Tactic, GameState } from '../types';

export const tactics: Tactic[] = [];

export const defaultPositions = (): GameState => ({
  teamA: [{x:10.5,y:7.5},{x:9,y:3},{x:9,y:12},{x:1.8,y:4.5},{x:1.8,y:10.5}],
  teamB: [{x:6,y:5.5},{x:6,y:9.5},{x:3.5,y:4},{x:3.5,y:7.5},{x:3.5,y:11}],
  ball: {x:11.5,y:7.5},
});
