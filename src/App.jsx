import logo from './logo.svg';
// import './App.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { API, graphqlOperation } from 'aws-amplify'
import { useEffect, useState } from 'react';
import { createNote, deleteNote, updateNote } from './graphql/mutations';
import { listNotes } from './graphql/queries';
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions';
// import { useLazyQuery, useMutation, gql } from "@apollo/client";

function App(props) {
  const { user, signOut } = props
  // console.log(user, signOut)

  const [notes, setNotes] = useState([])
  const [note, setNote] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)


  async function fetchData() {
    const result = await API.graphql(graphqlOperation(listNotes))
    setNotes(result.data.listNotes.items.filter(item => !item._deleted))
  }

  useEffect(() => {
    fetchData()
    const createNoteLisener = API.graphql(graphqlOperation(onCreateNote, { owner: user.username })).subscribe({
      next: data => {
        console.log(data, "created")
        const newNote = data.value.data.onCreateNote
        setNotes(prevNotes => {
          const prev = prevNotes.filter(note => note.id !== newNote.id)
          return [...prev, newNote]
        })
        setNote('')
      }
    })
    const updateNoteListener = API.graphql(graphqlOperation(onUpdateNote, { owner: user.username })).subscribe({
      next: data => {
        console.log(data, "updated")
        const updatedNote = data.value.data.onUpdateNote
        setNotes(prevNotes => {
          const index = prevNotes.findIndex(note => note.id === updatedNote.id)
          prevNotes[index] = updatedNote
          return prevNotes
        })
        setNote('')
        setSelectedItem(null)
      }
    })
    const deletNoteListener = API.graphql(graphqlOperation(onDeleteNote, { owner: user.username })).subscribe({
      next: data => {
        console.log(data, "deleted!")
        const deletedNote = data.value.data.onDeleteNote
        setNotes(prevNotes => {
          const remNotes = prevNotes.filter(note => note.id !== deletedNote.id)
          return remNotes
        })
      }
    })
    return () => {
      createNoteLisener.unsubscribe()
      updateNoteListener.unsubscribe()
      deletNoteListener.unsubscribe()
    }
  }, [])

  function handleChange(e) {
    setNote(e.target.value)
  }
  // const [createInfo, { data, loading }] = useMutation(gql`${createNote}`);
  function getButText() {
    return selectedItem ? "Update Note" : "Add Note"
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedItem) {
      const input = { id: selectedItem.id, _version: selectedItem._version, note }
      await API.graphql(graphqlOperation(updateNote, { input }))
      console.log("Updated!")
      // const index = notes.findIndex(note => note.id === response.data.updateNote.id)
      // notes[index] = response.data.updateNote
      // // fetchData()
      // setNote('')
      // setSelectedItem(null)
    } else {
      const input = { note }
      await API.graphql(graphqlOperation(createNote, { input }))
      // const newNote = result.data.createNote
      // setNotes([newNote, ...notes])
      // fetchData()
    }

    // createInfo({variables : input})
    // if(loading){
    //   console.log('loading...')
    // }
    // if(!loading && data){
    //   console.log(data)
    // }
  }

  async function handleDeleteNote(id, _version) {
    const input = { id, _version }
    await API.graphql(graphqlOperation(deleteNote, { input }))
    // const remNotes = notes.filter(note => note.id !== response.data.deleteNote.id)
    // setNotes(remNotes)
  }

  function handleSelect(item) {
    setNote(item.note)
    setSelectedItem(item)
  }


  return (
    <div className='flex flex-column items-center justify-center pa3 bg-washed-red'>

      <h1>Hello {user.username}</h1>
      <button onClick={signOut}>Sign out</button>
      
      <h1 className='code f2-1'>Amplify Note</h1>
      {/* Note form */}
      <form className='mb3' onSubmit={handleSubmit}>
        <input type="text" className="pa2 f4" placeholder='Write your note' onChange={handleChange} value={note} />
        <button className="pa2 f4" type='submit'>{getButText()}</button>
      </form>
      {/* Note list */}
      <NoteList notes={notes} handleDeleteNote={handleDeleteNote} selectNote={handleSelect} />
    </div>
  );
}


function NoteList(props) {
  const { notes, handleDeleteNote, selectNote } = props
  return notes.length ?
    <div>
      {notes.map((item, indx) => (
        <div key={indx} className='flex items-center'>
          <li className="list pa1 f3" onClick={() => selectNote(item)}>
            {item.note}
          </li>
          <button className="bg-transparent" onClick={() => handleDeleteNote(item.id, item._version)}><span>&times;</span></button>
        </div>
      ))}
    </div> : <div>No notes created yet</div>
}

export default withAuthenticator(App, { includeGreetings: true });
