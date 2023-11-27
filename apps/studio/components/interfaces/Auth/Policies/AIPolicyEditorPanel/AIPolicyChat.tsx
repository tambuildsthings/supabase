import { zodResolver } from '@hookform/resolvers/zod'
import { compact, sortBy } from 'lodash'
import Image from 'next/image'
import OpenAI from 'openai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  AiIcon,
  FormControl_Shadcn_,
  FormField_Shadcn_,
  FormItem_Shadcn_,
  Form_Shadcn_,
  Input_Shadcn_,
} from 'ui'
import * as z from 'zod'

import { useProfile } from 'lib/profile'
import { Loader2 } from 'lucide-react'
import Message from './Message'

export const AIPolicyChat = ({
  messages,
  loading,
  onSubmit,
  onDiff,
}: {
  messages: OpenAI.Beta.Threads.Messages.ThreadMessage[]
  loading: boolean
  onSubmit: (s: string) => void
  onDiff: (s: string) => void
}) => {
  const { profile } = useProfile()
  // [Joshen] Separate state here as there's a delay between submitting and the API updating the loading status
  const [isLoading, setIsLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const name = compact([profile?.first_name, profile?.last_name]).join(' ')
  const sorted = useMemo(() => {
    return sortBy(messages, (m) => m.created_at).filter((m) => {
      if (m.content[0].type === 'text') {
        return !m.content[0].text.value.startsWith('Here is my database schema for reference:')
      }
      return false
    })
  }, [messages])

  const FormSchema = z.object({ chat: z.string() })
  const form = useForm<z.infer<typeof FormSchema>>({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    resolver: zodResolver(FormSchema),
    defaultValues: { chat: '' },
  })

  useEffect(() => {
    // 👇️ scroll to bottom every time messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!loading) {
      form.setValue('chat', '')
      setIsLoading(false)
    }
  }, [loading])

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <Message
          icon={<AiIcon className="[&>div>div]:border-white" />}
          postedBy="Assistant"
          message={`Hi${
            name ? ' ' + name : ''
          }, how can I help you? I'm powered by AI, so surprises and mistakes are possible.
        Make sure to verify any generated code or suggestions, and share feedback so that we can
        learn and improve.`}
        />

        {sorted.map((m) => {
          const content = m.content[0]
          if (content && content.type !== 'text') {
            return null
          }

          return (
            <Message
              key={m.id}
              icon={
                m.role === 'assistant' ? (
                  <AiIcon className="[&>div>div]:border-white" />
                ) : (
                  <div className="relative border shadow-lg w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={`https://github.com/${profile?.username}.png` || ''}
                      width={30}
                      height={30}
                      alt="avatar"
                      className="relative"
                    />
                  </div>
                )
              }
              postedBy={m.role === 'assistant' ? 'Assistant' : name ? name : 'You'}
              postedAt={m.created_at}
              message={content.text.value}
              onDiff={onDiff}
              isDebug={(m.metadata as any).type === 'debug'}
            />
          )
        })}

        <div ref={bottomRef} className="h-1" />
      </div>
      <Form_Shadcn_ {...form}>
        <form
          id="rls-chat"
          className="sticky p-5 flex-0 border-t"
          onSubmit={form.handleSubmit((data: z.infer<typeof FormSchema>) => {
            setIsLoading(true)
            onSubmit(data.chat)
          })}
        >
          <FormField_Shadcn_
            control={form.control}
            name="chat"
            render={({ field }) => (
              <FormItem_Shadcn_>
                <FormControl_Shadcn_>
                  <div className="relative">
                    <AiIcon className="absolute top-2 left-3 [&>div>div]:border-white" />
                    <Input_Shadcn_
                      {...field}
                      disabled={isLoading}
                      className={`bg-black rounded-full pl-10 ${isLoading ? 'pr-10' : ''}`}
                      placeholder="Ask for some changes to your policy"
                    />
                    {isLoading && <Loader2 className="absolute top-2 right-3 animate-spin" />}
                  </div>
                </FormControl_Shadcn_>
              </FormItem_Shadcn_>
            )}
          />
        </form>
      </Form_Shadcn_>
    </div>
  )
}
