import * as FaceDetector from "expo-face-detector";
import React, { useState, useEffect, useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { Camera, CameraType, FaceDetectionResult } from "expo-camera";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import MaskedView from "@react-native-community/masked-view";

import { FaceDetectionInterface, RectInterface } from "../../types";
import { contains } from "../../hooks/Liveness";
import { detections, initialState, instructionsText } from "../../constants";
import { UserContext } from "../../context/user/userContext";

const { width: windowWidth } = Dimensions.get("window");

const PREVIEW_SIZE = 325;
const PREVIEW_RECT: RectInterface = {
  minX: (windowWidth - PREVIEW_SIZE) / 2,
  minY: 50,
  width: PREVIEW_SIZE,
  height: PREVIEW_SIZE,
};

interface ActionsInterface {
  FACE_DETECTED: "yes" | "no";
  FACE_TOO_BIG: "yes" | "no";
  NEXT_DETECTION: null;
}

interface Action<T extends keyof ActionsInterface> {
  type: T;
  payload: ActionsInterface[T];
}

type PossibleActions = {
  [K in keyof ActionsInterface]: Action<K>;
}[keyof ActionsInterface];

const detectionReducer = (
  state: typeof initialState,
  action: PossibleActions
): typeof initialState => {
  switch (action.type) {
    case "FACE_DETECTED":
      if (action.payload === "yes") {
        return {
          ...state,
          faceDetected: action.payload,
          progressFill: 100 / (state.detectionsList.length + 1),
        };
      } else {
        // Reset
        return initialState;
      }
    case "FACE_TOO_BIG":
      return { ...state, faceTooBig: action.payload };
    case "NEXT_DETECTION":
      // next detection index
      const nextDetectionIndex = state.currentDetectionIndex + 1;

      // skip 0 index
      const progressMultiplier = nextDetectionIndex + 1;

      const newProgressFill =
        (100 / (state.detectionsList.length + 1)) * progressMultiplier;

      if (nextDetectionIndex === state.detectionsList.length) {
        // success
        return {
          ...state,
          processComplete: true,
          progressFill: newProgressFill,
        };
      }
      // next
      return {
        ...state,
        currentDetectionIndex: nextDetectionIndex,
        progressFill: newProgressFill,
      };
    default:
      throw new Error("Unexpected action type.");
  }
};

export default function Liveness() {
  const navigation = useNavigation();
  const [cameraPermission, setCameraPermission] = useState(null);
  const [state, dispatch] = React.useReducer(detectionReducer, initialState);
  const rollAngles = React.useRef<number[]>([]);
  const { setValue } = useContext(UserContext);

  const permisionFunction = async () => {
    const cameraPermission = await Camera.getCameraPermissionsAsync();

    setCameraPermission(cameraPermission.status === "granted");

    if (cameraPermission.status !== "granted") {
      alert("Permission for media access needed.");
    }
  };

  useEffect(() => {
    permisionFunction();
  }, []);

  const onFacesDetected = (result: FaceDetectionResult) => {
    // 1. There is only a single face in the detection results.
    if (result.faces.length !== 1) {
      dispatch({ type: "FACE_DETECTED", payload: "no" });
      return;
    }

    const face: FaceDetectionInterface = result.faces[0];
    const faceRect: RectInterface = {
      minX: face.bounds.origin.x,
      minY: face.bounds.origin.y,
      width: face.bounds.size.width,
      height: face.bounds.size.height,
    };

    // 2. The face is almost fully contained within the camera preview.
    const edgeOffset = 50;
    const faceRectSmaller: RectInterface = {
      width: faceRect.width - edgeOffset,
      height: faceRect.height - edgeOffset,
      minY: faceRect.minY + edgeOffset / 2,
      minX: faceRect.minX + edgeOffset / 2,
    };
    const previewContainsFace = contains({
      outside: PREVIEW_RECT,
      inside: faceRectSmaller,
    });
    if (!previewContainsFace) {
      dispatch({ type: "FACE_DETECTED", payload: "no" });
      return;
    }

    if (state.faceDetected === "no") {
      // 3. The face is not as big as the camera preview.
      const faceMaxSize = PREVIEW_SIZE - 90;
      if (faceRect.width >= faceMaxSize && faceRect.height >= faceMaxSize) {
        dispatch({ type: "FACE_TOO_BIG", payload: "yes" });
        return;
      }

      if (state.faceTooBig === "yes") {
        dispatch({ type: "FACE_TOO_BIG", payload: "no" });
      }
    }

    if (state.faceDetected === "no") {
      dispatch({ type: "FACE_DETECTED", payload: "yes" });
    }

    const detectionAction = state.detectionsList[state.currentDetectionIndex];

    switch (detectionAction) {
      case "BLINK":
        // Lower probabiltiy is when eyes are closed
        const leftEyeClosed =
          face.leftEyeOpenProbability <= detections.BLINK.minProbability;
        const rightEyeClosed =
          face.rightEyeOpenProbability <= detections.BLINK.minProbability;
        if (leftEyeClosed && rightEyeClosed) {
          dispatch({ type: "NEXT_DETECTION", payload: null });
        }
        return;
      case "NOD":
        // Collect roll angle data
        rollAngles.current.push(face.rollAngle);

        // Don't keep more than 10 roll angles (10 detection frames)
        if (rollAngles.current.length > 10) {
          rollAngles.current.shift();
        }

        // If not enough roll angle data, then don't process
        if (rollAngles.current.length < 10) return;

        // Calculate avg from collected data, except current angle data
        const rollAnglesExceptCurrent = [...rollAngles.current].splice(
          0,
          rollAngles.current.length - 1
        );

        // Summation
        const rollAnglesSum = rollAnglesExceptCurrent.reduce((prev, curr) => {
          return prev + Math.abs(curr);
        }, 0);

        // Average
        const avgAngle = rollAnglesSum / rollAnglesExceptCurrent.length;

        // If the difference between the current angle and the average is above threshold, pass.
        const diff = Math.abs(avgAngle - Math.abs(face.rollAngle));

        if (diff >= detections.NOD.minDiff) {
          dispatch({ type: "NEXT_DETECTION", payload: null });
        }
        return;
      case "TURN_HEAD_LEFT":
        // Negative angle is the when the face turns left
        if (face.yawAngle <= detections.TURN_HEAD_LEFT.maxAngle) {
          dispatch({ type: "NEXT_DETECTION", payload: null });
        }
        return;
      case "TURN_HEAD_RIGHT":
        // Positive angle is the when the face turns right
        if (face.yawAngle >= detections.TURN_HEAD_RIGHT.minAngle) {
          dispatch({ type: "NEXT_DETECTION", payload: null });
        }
        return;
      case "SMILE":
        // Higher probabiltiy is when smiling
        if (face.smilingProbability >= detections.SMILE.minProbability) {
          dispatch({ type: "NEXT_DETECTION", payload: null });
        }
        return;
    }
  };

  React.useEffect(() => {
    if (state.processComplete) {
      setTimeout(() => {
        setValue(true);
        navigation.goBack();
      }, 1000);
    }
  }, [state.processComplete]);

  if (cameraPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<View style={styles.mask} />}
      >
        <Camera
          style={StyleSheet.absoluteFill}
          type={CameraType.front}
          onFacesDetected={onFacesDetected}
          faceDetectorSettings={{
            mode: FaceDetector.FaceDetectorMode.fast,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
            runClassifications: FaceDetector.FaceDetectorClassifications.all,
            minDetectionInterval: 125,
            tracking: false,
          }}
        >
          <AnimatedCircularProgress
            style={styles.circularProgress}
            size={PREVIEW_SIZE}
            width={5}
            backgroundWidth={7}
            fill={state.progressFill}
            tintColor="#3485FF"
            backgroundColor="#e8e8e8"
          />
        </Camera>
      </MaskedView>
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          {state.faceDetected === "no" &&
            state.faceTooBig === "no" &&
            instructionsText.initialPrompt}

          {state.faceTooBig === "yes" && instructionsText.tooClose}

          {state.faceDetected === "yes" &&
            state.faceTooBig === "no" &&
            instructionsText.performActions}
        </Text>
        <Text style={styles.action}>
          {state.faceDetected === "yes" &&
            state.faceTooBig === "no" &&
            detections[state.detectionsList[state.currentDetectionIndex]]
              .instruction}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mask: {
    borderRadius: PREVIEW_SIZE / 2,
    height: PREVIEW_SIZE,
    width: PREVIEW_SIZE,
    marginTop: PREVIEW_RECT.minY,
    alignSelf: "center",
    backgroundColor: "white",
  },
  circularProgress: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    marginTop: PREVIEW_RECT.minY,
    marginLeft: PREVIEW_RECT.minX,
  },
  instructions: {
    fontSize: 20,
    textAlign: "center",
    top: 25,
    position: "absolute",
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: PREVIEW_RECT.minY + PREVIEW_SIZE,
  },
  action: {
    fontSize: 24,
    textAlign: "center",
    fontWeight: "bold",
  },
});
