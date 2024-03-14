import React, { Component } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner"; 
import GraphicDisplay from "./graphicdisplay";
import { preprocessSVG, convertCoordinates } from "../utils/svg";
import { cloneDeep } from "lodash";
import { createEmptyGraph, } from "../utils/graph";
import { ReactComponent as Crop } from "../icons/scissors.svg";
import IconButton from "./iconbutton";
import { isUndef } from "../utils/misc";

function skipClear(props) {
  const { disableClear } = props;
  return !isUndef(disableClear) && disableClear;
}

// encodes the interpretation of click within the 
// rectangle annotation. That is, are we dragging the 
// corner, the edge or moving around the whole rectangle
const RECTANGLE_CLICK_TYPES = [
  { type: 'TOP_LEFT', move: 'corner' },
  { type: 'TOP', move: 'edge' },
  { type: 'TOP_RIGHT', move: 'corner' }, 
  { type: 'LEFT', move: 'edge' }, 
  { type: 'WHOLE', move: 'rect' }, 
  { type: 'RIGHT', move: 'edge' }, 
  { type: 'BOTTOM_LEFT', move: 'corner' }, 
  { type: 'BOTTOM', move: 'edge'},
  { type: 'BOTTOM_RIGHT', move: 'corner' },
]

const CLICK_TYPE_PCT = 0.2; 

function mapClickToClickType (click, rect) { 
  const { x, y } = click; 
  const { x: rx, y: ry, width, height } = rect;

  const dx = (x - rx) / width; 
  const dy = (y - ry) / height;

  const col = (dx < CLICK_TYPE_PCT) ? 0 : ((dx > 1.0 - CLICK_TYPE_PCT) ? 2 : 1); 
  const row = (dy < CLICK_TYPE_PCT) ? 0 : ((dy > 1.0 - CLICK_TYPE_PCT) ? 2 : 1); 

  return RECTANGLE_CLICK_TYPES[3 * row + col]; 
}

function makeRectFromOppositeCorners(cx, cy, ox, oy) {
  const width = Math.abs(ox - cx); 
  const height = Math.abs(oy - cy); 
  const x = Math.min(ox, cx); 
  const y = Math.min(oy, cy); 
  return { width, height, x, y };
}

function updatedAnnotation (click, initClickData) { 
  const { initAnnotation, initClick, dragType } = initClickData; 
  const { x: ix, y: iy } = initClick; 
  const { x: rx, y: ry, width, height } = initAnnotation; 
  if (dragType.move === 'rect') {
    const dx = rx - ix; 
    const dy = ry - iy; 
    const nx = click.x + dx; 
    const ny = click.y + dy; 
    return { x: nx, y: ny, width, height }
  } else if (dragType.move === 'corner') {
    let ox, oy, cx, cy; 
    switch(dragType.type) {
      case 'TOP_LEFT' :
        cx = rx;
        cy = ry; 
        ox = rx + width; 
        oy = ry + height; 
        break; 
      case 'TOP_RIGHT' :
        cx = rx + width; 
        cy = ry; 
        ox = rx; 
        oy = ry + height; 
        break;
      case 'BOTTOM_LEFT' : 
        cx = rx;
        cy = ry + height; 
        ox = rx + width; 
        oy = ry; 
        break;
      case 'BOTTOM_RIGHT' : 
        cx = rx + width; 
        cy = ry + height; 
        ox = rx;
        oy = ry; 
        break;
      default :
        cx = cy = ox = oy = 0;
        break;
    }
    const dx = cx - ix; 
    const dy = cy - iy; 
    cx = click.x + dx;
    cy = click.y + dy; 
    return makeRectFromOppositeCorners (cx, cy, ox, oy) ;
  } else { 
    // dragType.move === 'edge'
    if (dragType.type === 'LEFT') { 
      const dx = rx - ix;
      const nx = click.x + dx;
      return { x: nx, y: ry, width: (rx + width - nx), height }; 
    } else if (dragType.type === 'RIGHT') {
      const dx = rx + width - ix;
      const nx = click.x + dx;
      return { x: rx, y: ry, width: (nx - rx), height }; 
    } else if (dragType.type === 'TOP') { 
      const dy = ry - iy;
      const ny = click.y + dy;
      return { x: rx, y: ny, width, height: (ry + height - ny) }; 
    } else { 
      const dy = ry + height - iy;
      const ny = click.y + dy;
      return { x: rx, y: ry, width, height: (ny - ry) }; 
    }
  }
}

class GroupUI extends Component {
  /*
   * Set the initial state of the component.
   *
   * This is just a formality because the state
   * would be over-written when the component mounts
   * because there, we can do an AJAX call to retrieve
   * an SVG from the server.
   *
   * Here we use a placeholder SVG string.
   */
  constructor(props) {
    super(props);
    const graphic = preprocessSVG('<svg height="100" width="100"></svg>');
    const graph = createEmptyGraph(graphic, { nodes: {}, links: {} });
    this.fileInputRef = React.createRef(); 
    this.state = {
      graphic,
      graph,
      hover: [],
      selected: [],
      filename: "",
      svgString: '<svg height="100" width="100"></svg>',
      nothingIn: false, 
      imageURL: undefined, 
      imageWidth: undefined, 
      imageHeight: undefined,
      selectedFile: undefined,
      annotations: [],
      clickRegistry: undefined,
      dragActive: false, 
      cursorMoved: false
    };
  }

  handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      const graphic = preprocessSVG('<svg height="100" width="100"></svg>');
      this.setState({ selectedFile: file, imageURL, graphic });

      const img = new Image();
      img.onload = () => {
        this.setState({ imageWidth: img.width, imageHeight: img.height });
      };
      img.src = imageURL;
    }
  };

  openFileDialog = () => {
    this.fileInputRef.current.click();
  }

  handleDragOver = (event) => {
    event.preventDefault();
  }

  handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length) {
      this.handleFiles(files);
    }
  };

  handleFiles = (files) => {
    // Handle the files
  };

  /*
   * When the component mounts, add an event listener for
   * click. Any click which isn't caught by a child element
   * of window will be caught here and whatever has been
   * selected by the user would be cleared
   */
  componentDidMount() {
    fetch('/upload.svg')
      .then((response) => response.text())
      .then((response) => this.setState({ graphic: preprocessSVG(response) })); 
    
    window.addEventListener("click", this.handleClear);
    window.addEventListener("keydown", this.handleKeyPress); 
  }

  /*
   * When the component unmounts, remove the click
   * event listener.
   */
  componentWillUnmount() {
    if (!isUndef(this.props.setHighlight)) {
      const { setHighlight, setShowNext } = this.props;
      setHighlight(false); 
      setShowNext(false); 
    }
    window.removeEventListener("click", this.handleClear);
    window.removeEventListener("keydown", this.handleKeyPress);
  }

  handleKeyPress = (evt) => {
    if (evt.key === 'Backspace' || evt.key === 'Delete') {
      this.setState((prevState) => {
        const { selected, annotations } = prevState; 
        let newAnnotations = cloneDeep(annotations); 
        for (let i = 0; i < selected.length; i++) {
          newAnnotations[selected[i]] = undefined; 
        }
        return { annotations: newAnnotations, selected: [] };
      }); 
    }
  }

  tryNotifyParent = (msg) => {
    const { notifyParent } = this.props;
    if (!isUndef(notifyParent)) {
      notifyParent(msg);
    }
  };

  uploadImageAndClick = (file, click, clickIndex) => { 
    this.setState({ nothingIn: true }); 
    const formData = new FormData();
    formData.append("image", file);
    formData.append("click", JSON.stringify(click));
    fetch(this.props.target, { 
      method: "POST",
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      this.setState((prevState) => {
        const { annotations } = prevState; 
        let newAnnotations = cloneDeep(annotations); 
        newAnnotations[clickIndex] = undefined; 
        newAnnotations.push({ type: 'rectangle', ...data }); 
        return { nothingIn: false, annotations: newAnnotations }; 
      }); 
    })
  }

  /*
   * Handle Click event on a particular node.
   *
   * Whenever a click event occurs in either the svg handler or
   * the graph handler, this function is called. By clicking on
   * nodes, they either get selected/de-selected according to
   * whether they were de-selected or selected earlier.
   *
   * A node cannot be selected if it's ancestor or descendent is
   * already selected.
   *
   * @param   {Number}  id - Id of the node on which
   * the event was fired.
   */
  handleClick = (event) => {
    const x = event.clientX; 
    const y = event.clientY; 
    this.setState((prevState) => {
      const { annotations, dragActive, selectedFile } = prevState; 
      if (isUndef(selectedFile)) { 
        this.openFileDialog();
      } else {
        if (!dragActive) {
          const clickPoint = convertCoordinates('svg-element', x, y);
          const newAnnotations = [...annotations, { type: "point", ...clickPoint }];
          this.uploadImageAndClick(prevState.selectedFile, clickPoint, annotations.length); 
          return { annotations: newAnnotations };
        }
      }
    });
  };

  handleMouseOverSvg = (event) => {
    const click = convertCoordinates('svg-element', event.clientX, event.clientY); 
    this.setState((prevState) => {
      const { dragActive } = prevState; 
      if (dragActive) { 
        const { clickRegistry, annotations } = prevState; 
        const newAnnotations = cloneDeep(annotations); 
        newAnnotations[clickRegistry.index] = updatedAnnotation(click, clickRegistry); 
        return { annotations: newAnnotations, cursorMoved: true }; 
      }
    }); 
  }; 

  handlePointerOver = (id) => {
  };

  handlePointerLeave = (id) => {
  };

  handleCropClick = (event) => {
    const { selectedFile, annotations } = this.state;
    let rectangleAnnotations = annotations.filter((x) => (!isUndef(x))); 
    // rectangleAnnotations = rectangleAnnotations.filter((x) => (x.type === 'rectangle')); 
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("annot", JSON.stringify(rectangleAnnotations));
    fetch('/cropper', { 
      method: "POST",
      body: formData,
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'crops.zip');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }); 
  };

  handleDragStartRect = (evt, annotation, index) => {
    const click = convertCoordinates('svg-element', evt.clientX, evt.clientY);
    this.setState((prevState) => {
      const { dragActive } = prevState; 
      if (dragActive) {
        return {}; 
      }
      const clickData = {
        dragType: mapClickToClickType(click, annotation), 
        initClick: click, 
        initAnnotation: annotation,
        index: index
      }
      return { clickRegistry: clickData, dragActive: true }; 
    }); 
  }

  handleDragRect = (evt, annotation, index) => {
    const click = convertCoordinates('svg-element', evt.clientX, evt.clientY);
    this.setState((prevState) => {
      const { dragActive, clickRegistry, annotations } = prevState; 
      if (dragActive) { 
        const newAnnotations = cloneDeep(annotations); 
        newAnnotations[clickRegistry.index] = updatedAnnotation(click, clickRegistry); 
        return { annotations: newAnnotations, cursorMoved: true }; 
      }
    }); 
  }

  handleClickRect = (evt, annotation, index) => {
    this.setState((prevState) => {
      const { selected, cursorMoved } = prevState; 
      if (!cursorMoved) { 
        if (selected.includes(index)) {
          return { selected: selected.filter((i) => i !== index) }; 
        } else {
          return { selected: [...selected, index] }; 
        }
      }
    }); 
  }

  handleDragEndRect = (evt, annotation, index) => {
    this.setState((prevState) => {
      if (prevState.cursorMoved) { 
        setTimeout(() => {
          this.setState({ cursorMoved: false }); 
        }, 100); 
      }
      return { clickRegistry: undefined, dragActive: false }
    });
  }

  /*
   * Clear the selections.
   *
   * Whenever any useless part of the window
   * is clicked, de-select all the selected paths.
   * This is what happens in a lot of graphics
   * editors.
   */
  handleClear = (event) => {
    if (skipClear(this.props)) return;
    const selected = [];
    this.setState({ selected });
    this.tryNotifyParent({ type: "clear" });
  };

  render() {
    let { highlightSvg, highlightGroup, highlightGraph } = this.props;
    if (this.state.nothingIn) {
      return (
        <Row className="py-3 align-items-center">
          <Col className="d-flex justify-content-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        </Row>
      );
    }
    if (isUndef(highlightSvg)) highlightSvg = [];
    if (isUndef(highlightGraph)) highlightGraph = [];
    if (isUndef(highlightGroup)) highlightGroup = false;

    return (
      <>
        <input
          ref={this.fileInputRef}
          type="file"
          onChange={this.handleFileChange}
          style={{ display: 'none' }}
        />
        <Row className="mt-2 mb-4">
          <Col className="d-flex justify-content-center">
            <GraphicDisplay
              graphic={this.state.graphic}
              graph={this.state.graph}
              imageWidth={this.state.imageWidth}
              imageHeight={this.state.imageHeight}
              imageURL={this.state.imageURL} 
              selected={this.state.selected}
              annotations={this.state.annotations}
              hover={this.state.hover}
              onClick={this.handleClick}
              onPointerOver={this.handlePointerOver}
              onPointerLeave={this.handlePointerLeave}
              highlight={highlightSvg}
              onDragStartRect={this.handleDragStartRect}
              onDragRect={this.handleDragRect}
              onDragEndRect={this.handleDragEndRect}
              onClickRect={this.handleClickRect} 
              onMouseOverSvg={this.handleMouseOverSvg}
              onClickCross={this.props.onClickCross}
            />
          </Col>
        </Row>
        <Row className="border-top">
          <Col>
            <IconButton
              name="Crop"
              active={true}
              onClick={this.handleCropClick}
              // highlight={highlightCrop}
            >
              <Crop />
            </IconButton>
          </Col>
        </Row>
      </>
    );
  }
}

export default GroupUI;
