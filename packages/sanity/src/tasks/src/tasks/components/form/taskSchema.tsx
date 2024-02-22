import {defineType} from 'sanity'

import {MentionUserFormField} from './MentionUserFormField'

export const taskSchema = defineType({
  type: 'document',
  name: 'tasks.task',
  liveEdit: true,
  fields: [
    {
      type: 'string',
      title: 'Title',
      name: 'title',
    },
    {
      type: 'array',
      name: 'description',
      title: 'Description',
      of: [
        {
          type: 'block',
          name: 'block',
          of: [
            {
              name: 'mention',
              type: 'object',
              fields: [
                {
                  name: 'userId',
                  type: 'string',
                },
              ],
            },
          ],
          marks: {
            annotations: [],
          },
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
        },
      ],
    },
    {
      type: 'object',
      name: 'target',
      title: 'Target',
      fields: [
        {
          name: 'document',
          type: 'crossDatasetReference',
          dataset: 'playground',
          weak: true,
          studioUrl: ({id, type}) => `intent/edit/id=${id};type=${type}/`,
          to: [
            {
              type: 'pt_allTheBellsAndWhistles',
              preview: {
                select: {
                  title: 'title',
                },
              },
            },
          ],
        },
        {
          name: 'documentType',
          type: 'string',
          title: 'Document type',
        },
      ],
    },
    {
      type: 'string',
      name: 'assignedTo',
      components: {
        input: MentionUserFormField,
      },
    },
    {
      type: 'string',
      name: 'authorId',
      hidden: true,
    },
    {
      type: 'string',
      name: 'status',
      title: 'Status',
      options: {
        list: ['open', 'closed'],
      },
      hidden: true,
    },
  ],
})
