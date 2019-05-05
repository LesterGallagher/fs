import React, { Component, Fragment } from 'react';
import { Button, Grid, Segment, Icon, Label, Modal, Image, Header, Input } from 'semantic-ui-react';
import Dropzone from 'react-dropzone';
import './Home.css';
import classnames from 'classnames';
import './Home.css';
import FileStore from '../stores/FileStore';
import icons from 'file-icons-js';
import { format } from 'timeago.js';
import prettyBytes from 'pretty-bytes';
import { fileMeta } from '../util';
import { Loader, SyncLoader } from 'react-spinners';
import { saveAs } from 'file-saver';
import { parse } from 'query-string'; 

class Home extends Component {
    constructor(props) {
        super();
        this.state = {
            files: [],
            connectUrl: '',
            open: false
        };

    }

    onDrop = async blobs => {
        const buffers = await Promise.all(blobs.map(blob => new Response(blob).arrayBuffer()));
        FileStore.addFiles(blobs.map((blob, i) => Object.assign(fileMeta(blob), { buffer: buffers[i], downloaded: true, downloading: false, user: FileStore.user })));
    }

    componentWillMount() {
        FileStore.on('change', this.handleFileStoreChange);
    }

    componentWillUnmount() {
        FileStore.removeListener('change', this.handleFileStoreChange);
    }

    handleFileStoreChange = () => {
        this.setState({ files: FileStore.files });
    }

    connect = e => {
        const id = parse(new URL(this.state.connectUrl, window.location.href).search).id || this.state.connectUrl;
        FileStore.changeRoom(id);
        this.setState({ open: false });
    }

    render() {
        console.log(this.state.files);
        return (
            <div className="Home">


                <Dropzone onDrop={this.onDrop}>
                    {({ getRootProps, getInputProps, isDragActive }) => (
                        <section>
                            <Modal onClose={e => this.setState({ open: false })} open={this.state.open} trigger={<Button onClick={e => this.setState({ open: true })} primary icon='play' content='Connect' />}>
                                <Modal.Header>Connect</Modal.Header>
                                <Modal.Content>
                                    <Modal.Description>
                                        <p>Paste in the same URL as the person you want to connect to.</p>
                                        <p>Simply copy the url bar from the other user, email or message it and paste it here.</p>
                                        <Input value={this.state.connectUrl} onChange={e => this.setState({ connectUrl: e.target.value })} placeholder="The url" />
                                        {' '}<Button onClick={this.connect} primary>Connect</Button>
                                    </Modal.Description>
                                </Modal.Content>
                            </Modal>
                            <Button primary icon='upload' content='Upload' {...getRootProps()} />
                            <div {...getRootProps({
                                className: classnames({
                                    dropzone: true,
                                    active: isDragActive
                                }),
                                onClick: event => event.stopPropagation()
                            })}>
                                <input {...getInputProps()} />
                                <Grid>
                                    {this.state.files.map(file => {
                                        const { downloaded, downloading, name, size, lastModified, user, type } = file;
                                        console.log(file);
                                        return (<Grid.Column key={name} computer={3} mobile={6} tablet={9}>
                                            <Segment style={{ textAlign: 'center' }}>
                                                <span className={'file-icon ' + icons.getClass(name)}></span><br />
                                                {name}<br />
                                                Last modified: {format(lastModified)}<br />
                                                {!downloaded && <Button as='div' labelPosition='right'>
                                                    <Button onClick={e => FileStore.downloadFiles([file])} color='red'>
                                                        <Icon name='download' />
                                                        Download
                                                    </Button>
                                                    <Label as='span' basic color='red' pointing='left'>
                                                        {prettyBytes(size)}
                                                    </Label>
                                                </Button>}
                                                {downloaded && <Button as='div' labelPosition='right'>
                                                    <Button onClick={e => saveAs(new Blob([file.buffer], { type }))} color='blue'>
                                                        <Icon name='download' />
                                                        Save
                                                    </Button>
                                                    <Label as='span' basic color='blue' pointing='left'>
                                                        {prettyBytes(size)}
                                                    </Label>
                                                </Button>}
                                                <div style={{ height: 30, padding: 5, textAlign: 'center' }}>
                                                    {<SyncLoader
                                                        sizeUnit={"px"}
                                                        size={20}
                                                        color={'#1a69a4'}
                                                        loading={downloading} />}
                                                </div>
                                            </Segment>
                                        </Grid.Column>)
                                    })}
                                </Grid>
                                <br />
                                <p>Drag 'n' drop some fancy files.</p>
                            </div>
                        </section>
                    )}
                </Dropzone>
            </div >
        );
    }
}

export default Home;
