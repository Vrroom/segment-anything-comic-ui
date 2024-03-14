/**
 * @file GraphicDisplay class implementation.
 *
 * @author Sumit Chaturvedi
 */
import React, { Component } from "react";
import addStopPropagation from "../utils/eventModifier";
import { selectColor, highlightColor, rgb2string } from "../utils/palette";
import { isStyleNotNone } from "../utils/svg";
import { node2ReactElement } from "../utils/reacthelpers";
import { isUndef } from "../utils/misc";
import alphaBlink from "../utils/math";

function validHighlight(hl) {
  return !isUndef(hl) && hl.length > 0;
}

function coverElement(path, key, props, t) {
  const { graph, selected, hover, highlight } = props;
  const selectedId = selected.map((i) => graph.nodes[i].paths).flat();
  if (
    !validHighlight(highlight) &&
    !selectedId.includes(key) &&
    !hover.includes(key)
  ) {
    return null;
  }
  const { onClick } = props;
  let color = "none";
  if (validHighlight(highlight) && highlight.includes(key)) {
    color = rgb2string(highlightColor, alphaBlink(t));
  } else if (selectedId.includes(key)) {
    color = rgb2string(selectColor, 1);
  } else if (hover.includes(key)) {
    color = rgb2string(selectColor, 0.6);
  }
  const fill = isStyleNotNone("fill", path.properties) ? color : "none";
  const stroke = isStyleNotNone("stroke", path.properties) ? color : "none";
  return React.createElement(path.tagName, {
    ...path.properties,
    id: "cover-element",
    fill,
    stroke,
    onClick: addStopPropagation((evt) => onClick(evt, key)),
  });
}

function getAdjustedPlacement (imageWidth, imageHeight) { 
  if (imageHeight > imageWidth) { 
    const newHeight = 100;
    const newWidth = Math.floor(100 * (imageWidth / imageHeight)); 
    const newY = 0; 
    const newX = Math.floor((100 - newWidth) / 2); 
    return { h: newHeight, w: newWidth, x: newX, y: newY }; 
  } else {
    const newWidth = 100;
    const newHeight = Math.floor(100 * (imageHeight / imageWidth)); 
    const newX = 0; 
    const newY = Math.floor((100 - newHeight) / 2); 
    return { h: newHeight, w: newWidth, x: newX, y: newY }; 
  }

}

function pathElement(path, key, events) {
  const { onClick, onPointerOver, onPointerLeave } = events;
  return React.createElement(path.tagName, {
    ...path.properties,
    id: `path-${key}`,
    onClick: addStopPropagation((evt) => onClick(evt, key)),
    onPointerOver: addStopPropagation(() => onPointerOver(key)),
    onPointerLeave: addStopPropagation(() => onPointerLeave(key)),
  });
}

function createAnnotationElement (annotation, index, props) { 
  // this is basically an svg cross using two lines
  if (isUndef(annotation)) {
    return <></>; 
  }
  const { selected } = props; 
  const color = selected.includes(index) ? "red" : "cyan"; 
  const { type } = annotation;
  const crossSize = 0.5; 
  if (type === "point") {
    const { x, y } = annotation;
    const line1 = {
      x1: x - crossSize,
      y1: y,
      x2: x + crossSize,
      y2: y,
    };
    const line2 = {
      x1: x,
      y1: y - crossSize,
      x2: x,
      y2: y + crossSize,
    };
    return (
      <g>
        <line {...line1} stroke={ color } strokeWidth="0.5" strokeLinecap="round" />
        <line {...line2} stroke={ color } strokeWidth="0.5" strokeLinecap="round" />
      </g>
    );
  } else {
    const { x, y, width, height } = annotation;
    const cornerProps = { 
      stroke: color, 
      strokeWidth: "0.8", 
      strokeLinecap: "round"
    } 
        // onDragStart={addStopPropagation((evt) => props.onDragStartRect(evt, annotation, index))}
    return (
      <g 
        key={`annotation-${index}`} 
        draggable="true"
        onMouseDown={addStopPropagation((evt) => props.onDragStartRect(evt, annotation, index))}
        onMouseMove={addStopPropagation((evt) => props.onDragRect(evt, annotation, index))} 
        onMouseUp={addStopPropagation((evt) => props.onDragEndRect(evt, annotation, index))}
        onClick={addStopPropagation((evt) => props.onClickRect(evt, annotation, index))}
      >
        <line
          x1={x}
          y1={y}
          x2={x + crossSize}
          y2={y}
          {...cornerProps}
        />
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={y + crossSize}
          {...cornerProps}
        />
        <line
          x1={x + width}
          y1={y}
          x2={x + width - crossSize}
          y2={y}
          {...cornerProps}
        />
        <line
          x1={x + width}
          y1={y}
          x2={x + width}
          y2={y + crossSize}
          {...cornerProps}
        />
        <line
          x1={x}
          y1={y + height}
          x2={x + crossSize}
          y2={y + height}
          {...cornerProps}
        />
        <line
          x1={x}
          y1={y + height}
          x2={x}
          y2={y + height - crossSize}
          {...cornerProps}
        />
        <line
          x1={x + width}
          y1={y + height}
          x2={x + width - crossSize}
          y2={y + height}
          {...cornerProps}
        />
        <line
          x1={x + width}
          y1={y + height}
          x2={x + width}
          y2={y + height - crossSize}
          {...cornerProps}
        />
        <rect 
          x={x} 
          y={y} 
          width={width} 
          height={height} 
          style={{ 
            fill: color, 
            fillOpacity: 0.3,
            stroke: color, 
            strokeDasharray: "1,1", 
            strokeWidth: 0.2
          }} 
        />
      </g>
    );
  }
}

class GraphicDisplay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      x: 0,
    };
    if (validHighlight(props.highlight)) {
      this.counter = setInterval(this.increment, 40);
    }
  }

  increment = () => {
    this.setState((prevState) => {
      const { x } = prevState;
      return { x: x + 1 };
    });
  };

  componentDidUpdate(prevProps) {
    const { highlight } = this.props;
    if (!validHighlight(prevProps.highlight) && validHighlight(highlight)) {
      this.counter = setInterval(this.increment, 40);
    } else if (
      validHighlight(prevProps.highlight) &&
      !validHighlight(highlight)
    ) {
      clearInterval(this.counter, 40);
    }
  }

  componentWillUnmount() {
    clearInterval(this.counter);
  }

  /**
   * Create React Elements for SVG paths.
   *
   * @returns {Array}   List of graphic elements as React Elements.
   */
  graphicElements = () => {
    const { imageURL, imageHeight, imageWidth, annotations} = this.props;
    if (!isUndef(imageURL)) { 
      const { x, y, h, w } = getAdjustedPlacement(imageWidth, imageHeight); 
      const imageJSX = <image href={ imageURL } x={ x } y={ y } height={ h } width={ w }/>;
      let elements = [imageJSX]; 
      elements = elements.concat(annotations.map((anno, idx) => createAnnotationElement(anno, idx, this.props))); 
      return elements; 
    }
    const { paths, defs } = this.props.graphic;
    const elements = paths.map((path, key) => {
      return (
        <g key={`path-group-${key}`}>
          {pathElement(path, key, this.props)}
          {coverElement(path, key, this.props, this.state.x)}
        </g>
      );
    });
    if (typeof defs !== "undefined") {
      elements.splice(0, 0, node2ReactElement(defs));
    }
    return elements;
  };

  render() {
    const { svg } = this.props.graphic;
    const children = this.graphicElements();
    return React.createElement(
      svg.tagName,
      { ...svg.properties, id: "svg-element", onClick: this.props.onClick, onMouseOver:this.props.onMouseOverSvg, style: { cursor: 'grab' } },
      children
    );
  }
}

export default GraphicDisplay;
