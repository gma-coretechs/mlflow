import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getExperiment, getParams, getRunInfo, getRunTags } from '../reducers/Reducers';
import { connect } from 'react-redux';
import './RunView.css';
import HtmlTableView from './HtmlTableView';
import { Link } from 'react-router-dom';
import Routes from '../Routes';
import { Dropdown, MenuItem } from 'react-bootstrap';
import ArtifactPage from './ArtifactPage';
import { getLatestMetrics } from '../reducers/MetricReducer';
import { Experiment } from '../sdk/MlflowMessages';
import Utils from '../utils/Utils';
import { NoteInfo } from "../utils/NoteUtils";
import BreadcrumbTitle from "./BreadcrumbTitle";
import RenameRunModal from "./modals/RenameRunModal";
import NoteEditorView from "./NoteEditorView";
import NoteShowView from "./NoteShowView";
import EditableTagsTableView from './EditableTagsTableView';
import { Icon } from 'antd';


const NOTES_KEY = 'notes';
const PARAMETERS_KEY = 'parameters';
const METRICS_KEY = 'metrics';
const ARTIFACTS_KEY = 'artifacts';
const TAGS_KEY = 'tags';

class RunView extends Component {
  constructor(props) {
    super(props);
    this.onClickExpander = this.onClickExpander.bind(this);
    this.getExpanderClassName = this.getExpanderClassName.bind(this);
    this.handleRenameRunClick = this.handleRenameRunClick.bind(this);
    this.hideRenameRunModal = this.hideRenameRunModal.bind(this);
    this.handleExposeNotesEditorClick = this.handleExposeNotesEditorClick.bind(this);
    this.handleSubmittedNote = this.handleSubmittedNote.bind(this);
    this.handleNoteEditorViewCancel = this.handleNoteEditorViewCancel.bind(this);
    this.renderNoteSection = this.renderNoteSection.bind(this);
    this.state.showTags = Utils.getVisibleTagValues(props.tags).length > 0;
  }

  static propTypes = {
    runUuid: PropTypes.string.isRequired,
    run: PropTypes.object.isRequired,
    experiment: PropTypes.instanceOf(Experiment).isRequired,
    experimentId: PropTypes.number.isRequired,
    params: PropTypes.object.isRequired,
    tags: PropTypes.object.isRequired,
    latestMetrics: PropTypes.object.isRequired,
    getMetricPagePath: PropTypes.func.isRequired,
    runDisplayName: PropTypes.string.isRequired,
    runName: PropTypes.string.isRequired,
  };

  state = {
    showNotesEditor: false,
    showNotes: true,
    showParameters: true,
    showMetrics: true,
    showArtifacts: true,
    showTags: true,
    showRunRenameModal: false,
  };

  onClickExpander(key) {
    switch (key) {
      case NOTES_KEY: {
        this.setState({ showNotes: !this.state.showNotes });
        return;
      }
      case PARAMETERS_KEY: {
        this.setState({ showParameters: !this.state.showParameters });
        return;
      }
      case METRICS_KEY: {
        this.setState({ showMetrics: !this.state.showMetrics });
        return;
      }
      case TAGS_KEY: {
        this.setState({ showTags: !this.state.showTags });
        return;
      }
      case ARTIFACTS_KEY: {
        this.setState({ showArtifacts: !this.state.showArtifacts });
        return;
      }
      default:
    }
  }

  getExpanderClassName(key) {
    switch (key) {
      case NOTES_KEY: {
        return this.state.showNotes ? 'fa-caret-down' : 'fa-caret-right';
      }
      case PARAMETERS_KEY: {
        return this.state.showParameters ? 'fa-caret-down' : 'fa-caret-right';
      }
      case METRICS_KEY: {
        return this.state.showMetrics ? 'fa-caret-down' : 'fa-caret-right';
      }
      case TAGS_KEY: {
        return this.state.showTags ? 'fa-caret-down' : 'fa-caret-right';
      }
      case ARTIFACTS_KEY: {
        return this.state.showArtifacts ? 'fa-caret-down' : 'fa-caret-right';
      }
      default: {
        return null;
      }
    }
  }

  handleExposeNotesEditorClick() {
    this.setState({ showNotesEditor: true, showNotes: true });
  }

  handleNoteEditorViewCancel() {
    this.setState({ showNotesEditor: false });
  }

  handleRenameRunClick() {
    this.setState({ showRunRenameModal: true });
  }

  hideRenameRunModal() {
    this.setState({ showRunRenameModal: false });
  }

  renderNoteSection(noteInfo) {
    if (this.state.showNotes) {
      if (this.state.showNotesEditor) {
        return <NoteEditorView
            runUuid={this.props.runUuid}
            noteInfo={noteInfo}
            submitCallback={this.handleSubmittedNote}
            cancelCallback={this.handleNoteEditorViewCancel}/>;
      } else if (noteInfo) {
        return <NoteShowView content={noteInfo.content}/>;
      } else {
        return <em>None</em>;
      }
    }
    return null;
  }

  getRunCommand() {
    const { tags, params } = this.props;
    let runCommand = null;
    const sourceName = Utils.getSourceName(tags);
    const sourceVersion = Utils.getSourceVersion(tags);
    const entryPointName = Utils.getEntryPointName(tags);
    if (Utils.getSourceType(tags) === "PROJECT") {
      runCommand = 'mlflow run ' + shellEscape(sourceName);
      if (sourceVersion && sourceVersion !== "latest") {
        runCommand += ' -v ' + shellEscape(sourceVersion);
      }
      if (entryPointName && entryPointName !== "main") {
        runCommand += ' -e ' + shellEscape(entryPointName);
      }
      Object.values(params).sort().forEach(p => {
        runCommand += ' -P ' + shellEscape(p.key + '=' + p.value);
      });
    }
    return runCommand;
  }

  render() {
    const { runUuid, run, params, tags, latestMetrics, getMetricPagePath } = this.props;
    const noteInfo = NoteInfo.fromRunTags(tags);
    const startTime = run.getStartTime() ? Utils.formatTimestamp(run.getStartTime()) : '(unknown)';
    const duration =
      run.getStartTime() && run.getEndTime() ? run.getEndTime() - run.getStartTime() : null;
    const queryParams = window.location && window.location.search ?
      window.location.search : "";
    const tableStyles = {
      table: {
        width: 'auto',
        minWidth: '400px',
      },
      th: {
        width: 'auto',
        minWidth: '200px',
        marginRight: '80px',
      }
    };
    const runCommand = this.getRunCommand();
    return (
      <div className="RunView">
        <div className="header-container">
          <BreadcrumbTitle
            experiment={this.props.experiment}
            title={this.props.runDisplayName}
          />
          <Dropdown id="dropdown-custom-1" className="mlflow-dropdown">
             <Dropdown.Toggle noCaret className="mlflow-dropdown-button">
               <i className="fas fa-caret-down"/>
             </Dropdown.Toggle>
             <Dropdown.Menu className="mlflow-menu header-menu">
               <MenuItem
                 className="mlflow-menu-item"
                 onClick={this.handleRenameRunClick}
               >
                 Rename
               </MenuItem>
             </Dropdown.Menu>
          </Dropdown>
          <RenameRunModal
            runUuid={runUuid}
            experimentId={this.props.experimentId}
            onClose={this.hideRenameRunModal}
            runName={this.props.runName}
            open={this.state.showRunRenameModal} />
        </div>
        <div className="run-info-container">
          <div className="run-info">
            <span className="metadata-header">Date: </span>
            <span className="metadata-info">{startTime}</span>
          </div>
          <div className="run-info">
            <span className="metadata-header">Run ID: </span>
            <span className="metadata-info">{runUuid}</span>
          </div>
          <div className="run-info">
            <span className="metadata-header">Source: </span>
            <span className="metadata-info">
              {Utils.renderSourceTypeIcon(Utils.getSourceType(tags))}
              {Utils.renderSource(tags, queryParams)}
            </span>
          </div>
          {Utils.getSourceVersion(tags) ?
            <div className="run-info">
              <span className="metadata-header">Git Commit: </span>
              <span className="metadata-info">{Utils.renderVersion(tags, false)}</span>
            </div>
            : null
          }
          {Utils.getSourceType(tags) === "PROJECT" ?
            <div className="run-info">
              <span className="metadata-header">Entry Point: </span>
              <span className="metadata-info">{Utils.getEntryPointName(tags) || "main"}</span>
            </div>
            : null
          }
          <div className="run-info">
            <span className="metadata-header">User: </span>
            <span className="metadata-info">{Utils.getUser(run, tags)}</span>
          </div>
          {duration !== null ?
            <div className="run-info">
              <span className="metadata-header">Duration: </span>
              <span className="metadata-info">{Utils.formatDuration(duration)}</span>
            </div>
            : null
          }
          {tags['mlflow.parentRunId'] !== undefined ?
            <div className="run-info">
              <span className="metadata-header">Parent Run: </span>
              <span className="metadata-info">
                <Link to={Routes.getRunPageRoute(this.props.experimentId,
                    tags['mlflow.parentRunId'].value)}>
                  {tags['mlflow.parentRunId'].value}
                </Link>
              </span>
            </div>
            : null
          }
          {tags['mlflow.databricks.runURL'] !== undefined ?
            <div className="run-info">
              <span className="metadata-header">Job Output: </span>
              <span className="metadata-info">
                <a
                  href={Utils.setQueryParams(tags['mlflow.databricks.runURL'].value, queryParams)}
                  target="_blank"
                >
                  Logs
                </a>
              </span>
            </div>
            : null
          }
        </div>
        {runCommand ?
          <div className="RunView-info">
            <h2>Run Command</h2>
            <textarea className="run-command text-area" readOnly value={runCommand}/>
          </div>
          : null
        }
        <div className="RunView-info">
          <h2 className="table-name">
            <span
              onClick={this.state.showNotesEditor ?
                undefined : () => this.onClickExpander(NOTES_KEY)}
              className="RunView-notes-headline">
              <i className={`fa ${this.getExpanderClassName(NOTES_KEY)}`}/>{' '}Notes
            </span>
            {!this.state.showNotes || !this.state.showNotesEditor ?
              <span>{' '}
                <a onClick={this.handleExposeNotesEditorClick} >
                  <Icon type="form" />
                </a>
              </span>
              :
              null
            }
          </h2>
          {this.renderNoteSection(noteInfo)}
          <h2 onClick={() => this.onClickExpander(PARAMETERS_KEY)} className="table-name">
            <span ><i className={`fa ${this.getExpanderClassName(PARAMETERS_KEY)}`}/></span>
            {' '}Parameters
          </h2>
          {this.state.showParameters ?
            <HtmlTableView
              columns={["Name", "Value"]}
              values={getParamValues(params)}
              styles={tableStyles}
            /> :
            null
          }
          <h2 onClick={() => this.onClickExpander(METRICS_KEY)} className="table-name">
            <span><i className={`fa ${this.getExpanderClassName(METRICS_KEY)}`}/></span>
            {' '}Metrics
          </h2>
          {this.state.showMetrics ?
            <HtmlTableView
              columns={["Name", "Value"]}
              values={getMetricValues(latestMetrics, getMetricPagePath)}
              styles={tableStyles}
            /> :
            null
          }
          <h2 onClick={() => this.onClickExpander(TAGS_KEY)} className="table-name">
            <span><i className={`fa ${this.getExpanderClassName(TAGS_KEY)}`}/></span>
            {' '}Tags
          </h2>
          {this.state.showTags ?
            <EditableTagsTableView
              runUuid={runUuid}
              tags={tags}
            /> : null
          }
        </div>
          <div>
            <h2 onClick={() => this.onClickExpander(ARTIFACTS_KEY)} className="table-name">
              <span><i className={`fa ${this.getExpanderClassName(ARTIFACTS_KEY)}`}/></span>
              {' '}Artifacts
            </h2>
            {this.state.showArtifacts ?
              <ArtifactPage runUuid={runUuid} isHydrated/> :
              null
            }
          </div>
      </div>
    );
  }

  handleSubmittedNote(err) {
    if (err) {
      // Do nothing; error is handled by the note editor view
    } else {
      // Successfully submitted note, close the editor
      this.setState({ showNotesEditor: false });
    }
  }
}

const mapStateToProps = (state, ownProps) => {
  const { runUuid, experimentId } = ownProps;
  const run = getRunInfo(runUuid, state);
  const experiment = getExperiment(experimentId, state);
  const params = getParams(runUuid, state);
  const tags = getRunTags(runUuid, state);
  const latestMetrics = getLatestMetrics(runUuid, state);
  const runDisplayName = Utils.getRunDisplayName(tags, runUuid);
  const runName = Utils.getRunName(tags, runUuid);
  return { run, experiment, params, tags, latestMetrics, runDisplayName, runName};
};

export default connect(mapStateToProps)(RunView);

// Private helper functions.

const getParamValues = (params) => {
  return Object.values(params).sort().map((p) =>
    [p.getKey(), p.getValue()]
  );
};

const getMetricValues = (latestMetrics, getMetricPagePath) => {
  return Object.values(latestMetrics).sort().map((m) => {
    const key = m.key;
    return [
      <Link to={getMetricPagePath(key)} title="Plot chart">
        {key}
        <i className="fas fa-chart-line" style={{paddingLeft: "6px"}}/>
      </Link>,
      Utils.formatMetric(m.value)
    ];
  });
};

const shellEscape = (str) => {
  if ((/["\r\n\t ]/).test(str)) {
    return '"' + str.replace(/"/g, '\\"') + '"';
  }
  return str;
};
