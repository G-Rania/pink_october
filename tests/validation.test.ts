import { describe,it,expect } from 'vitest';
import { validateMessageInput } from '../src/lib/validation';
const input={message:'Sending love',author_name:'',symbol:'🩷',website:'',request_id:'a246e4de-a142-4ac1-94ad-9b22c427fe01'};
describe('untrusted submissions',()=>{
  it('normalizes names, text, and anonymous attribution',()=>{
    expect(validateMessageInput({...input,message:'  Sending\u0000 love  '})).toMatchObject({message:'Sending love',author_name:'Anonymous'});
    expect(validateMessageInput({...input,author_name:'  Ana   Maria '})).toMatchObject({author_name:'Ana Maria'});
  });
  it('counts Unicode codepoints consistently with PostgreSQL',()=>{
    expect(()=>validateMessageInput({...input,message:'🩷'.repeat(280)})).not.toThrow();
    expect(()=>validateMessageInput({...input,message:'🩷'.repeat(281)})).toThrow();
  });
  it.each([null,[],{}, {...input,website:'spam'}, {...input,message:'hi'},
    {...input,message:'Read https://spam.example'}, {...input,author_name:'x'.repeat(41)},
    {...input,symbol:'unknown'}, {...input,request_id:'bad'}])('rejects malformed and spam submissions',value=>{
      expect(()=>validateMessageInput(value)).toThrow();
  });
});
