export const instructionsText = {
  initialPrompt: "Position your face in the circle",
  performActions: "Keep the device still and perform the following actions:",
  tooClose: "You're too close. Hold the device further.",
};

export const detections = {
  BLINK: { instruction: "Blink both eyes", minProbability: 0.3 },
  TURN_HEAD_LEFT: { instruction: "Turn head left", maxAngle: -15 },
  TURN_HEAD_RIGHT: { instruction: "Turn head right", minAngle: 15 },
  NOD: { instruction: "Nod", minDiff: 1.5 },
  SMILE: { instruction: "Smile", minProbability: 0.7 },
};

type DetectionActionsInterface = keyof typeof detections;

const detectionsList: DetectionActionsInterface[] = [
  "BLINK",
  "TURN_HEAD_LEFT",
  "TURN_HEAD_RIGHT",
  "NOD",
  "SMILE",
];

export const initialState = {
  faceDetected: "no" as "yes" | "no",
  faceTooBig: "no" as "yes" | "no",
  detectionsList,
  currentDetectionIndex: 0,
  progressFill: 0,
  processComplete: false,
};
