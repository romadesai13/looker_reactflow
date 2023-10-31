import React, { useCallback } from "react";
import ReactFlow, {
  addEdge,
  ConnectionLineType,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

import { jsonData } from "./sampledata";

function generateGroupId(dataNode) {
  return `${dataNode.Scenario}`;
}

function generateNodeId1(dataNode) {
  return `${dataNode.BusinessProcess}+${dataNode.Scenario}+${dataNode.Role}`;
}

function generatePrevNodeId(dataNode) {
  return `${dataNode.BusinessProcess_Prev}+${dataNode.Scenario_Prev}+${dataNode.Reole_Prev}`;
}

function getBgColor(state) {
  switch (state) {
    case 'Completed':
      return '#50C878';
    case 'InProgress':
      return 'yellow';
    case 'Upcoming':
      return '#E74C3C';
    default: 
      return 'black';
  }
}

function getChildNodes(dataNodes, groupId) {
  let children = [];
  dataNodes.forEach(node => {
    const idParts = node.id.split("+");
    if (idParts && idParts.length > 2 && idParts[1] == groupId) {
      children.push(node);
    }
  });

  return children;
}

function constructInitialNodes() {
  const nodes = [];
  const edges = [];
  if (jsonData) {
    jsonData.map((n) => {
      const groupId = generateGroupId(n);
      const nodeId = generateNodeId1(n);
      const prevNodeId = generatePrevNodeId(n);
      if (nodes.findIndex(x => x.id == groupId) == -1) {
        const newGroup = {
          id: groupId,
          data: { label: n.Scenario },
          draggable: false,
          className: 'light nodrag',
          type: "output",
          style: {
            width: 700,
            height: 900,
          },
          nodeType: 'Parent'
        };
        nodes.push(newGroup);
      }

      const newNode = {
        id: nodeId,
        data: { label: n.Role },
        draggable: false,
        style: { backgroundColor: getBgColor(n.State) },
        className: 'nodrag',
        nodeType: 'Child'
      };

      if (prevNodeId == "--") {
        newNode.type = "input";
      }
      nodes.push(newNode);

      if (prevNodeId != "--") {
        const edgeId = `${nodeId}-${prevNodeId}`;
        const edgeLabel = `to the ${n.Role}`;
        const edge = {
          id: edgeId,
          source: prevNodeId,
          target: nodeId,
          label: edgeLabel,
          type: "step",
        };

        edges.push(edge);
      }
    });
  }
  return {
    initialNodes: nodes,
    initialEdges: edges,
  };
}

const { initialNodes, initialEdges } = constructInitialNodes();

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes, edges, direction = "LR") => {
  let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE;
  let maxX = 0, maxY = 0;
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? "left" : "top";
    node.sourcePosition = isHorizontal ? "right" : "bottom";

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x, //- nodeWidth / 2,
      y: nodeWithPosition.y, //- nodeHeight / 2,
    };

    return node;
  });

  nodes.forEach((node) => {
    if (node.type === 'output') {
      let startX = Number.MAX_VALUE;
      let startY = Number.MAX_VALUE;
      let endX = 0;
      let endY = 0;
      let children = getChildNodes(nodes, node.id);
      children.forEach(element => {
        const nodeWithPosition = dagreGraph.node(element.id)
        if (startX > nodeWithPosition.x) {
          startX = nodeWithPosition.x;
        }

        if (startY > nodeWithPosition.y) {
          startY = nodeWithPosition.y;
        }

        if (endX < nodeWithPosition.x) {
          endX = nodeWithPosition.x;
        }

        if (endY < nodeWithPosition.y) {
          endY = nodeWithPosition.y;
        }
      });

      node.position = {
        x: startX - 50,//50 buffer,
        y: -50, //startY,
      };

      node.style = {
        width: endX + 172 - startX + 50,//50 buffer
        height: endY + 36 - startY > 900 ? endY + 36 - startY : 900, //900 for min height
        backgroundColor: 'rgba(255, 255, 255, 0)',
      }

      minX = node.position.x < minX ? node.position.x : minX; //start of first parent node
      minY = node.position.y < minY ? node.position.y : minY; //start of first parent node
      maxX = node.position.x + node.style.width > maxX ? node.position.x + node.style.width : maxX; //start of last node + width, to get fill width progress bar
      maxY = node.position.y + node.style.height > maxY ? node.position.y + node.style.height : maxY;//not needed, because fixed height
    }

    return node;
  });

  let completed = jsonData.filter(x => x.State == 'Completed');
  let child = nodes.filter(x=> x.nodeType == "Child");
  const total = [...new Set(child.map(item => item.id))];
  let percentComplete = Math.round(completed.length / total.length * 100);
  console.log(percentComplete);
  
  let frameWidth = maxX-minX;
  const progressBarGreenNode = {
    id: 'progressBarGreen',
    data: { label: percentComplete + '%' },
    draggable: false,
    className: 'pb',
    type: 'default',
    style: {
      width: (frameWidth * percentComplete)/100,
      height: 50,
      backgroundColor: '#50C878',
    },
    position: {
      x: minX,
      y: minY - 50
    },
    nodeType: 'progressBarGreen'
  };
  nodes.push(progressBarGreenNode);

  const progressBarRedNode = {
    id: 'progressBarRed',
    data: { label: 100 - percentComplete + '%' },
    draggable: false,
    className: 'pb',
    type: 'default',
    style: {
      width: maxX - (minX + (frameWidth * percentComplete)/100),
      height: 50,
      backgroundColor: '#E74C3C',
    },
    position: {
      x: minX + (frameWidth * percentComplete)/100,
      y: minY - 50
    },
    nodeType: 'progressBarRed'
  };
  nodes.push(progressBarRedNode)

  return { nodes, edges };
};

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

const AppFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          { ...params },
          eds
        )
      ),
    []
  );

  return (
    <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
          <Controls />
        </ReactFlow>
  );
};

export default AppFlow;
